package repository

import (
	"backend/internal/domain"
	"encoding/binary"
	"io"
	"log"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

const (
	fileVersion     = uint8(3)
	fileHeaderSize  = 9
	recordMetaSize  = 9
	indexVersion    = uint8(1)
	indexHeaderSize = 5
	indexEntrySize  = 12
)

type fileHeader struct {
	LastID int32
	Count  int32
}

type recordMeta struct {
	Offset int64
	Size   uint32
}

type payloadCodec[T any] struct {
	encode func(T) ([]byte, error)
	decode func([]byte, int) (T, error)
}

type binaryEntityStore[T any] struct {
	path      string
	indexPath string
	getID     func(T) int
	setID     func(*T, int)
	codec     payloadCodec[T]
	index     *extensibleHashIndex
	mu        sync.Mutex
}

func newBinaryEntityStore[T any](
	path string,
	getID func(T) int,
	setID func(*T, int),
	codec payloadCodec[T],
) (*binaryEntityStore[T], error) {
	store := &binaryEntityStore[T]{
		path:      path,
		indexPath: path + ".idx",
		getID:     getID,
		setID:     setID,
		codec:     codec,
		index:     newExtensibleHashIndex(4),
	}
	if err := store.ensureFile(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *binaryEntityStore[T]) ensureFile() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	file, err := os.OpenFile(s.path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	if info.Size() >= fileHeaderSize {
		vbuf := make([]byte, 1)
		if _, err := io.ReadFull(file, vbuf); err == nil && vbuf[0] == fileVersion {
			if err := s.rebuildIndex(file); err != nil {
				return err
			}
			return s.persistIndexFile()
		}
		log.Printf("aviso: %s em formato antigo, migrando para versao %d", s.path, fileVersion)
		if err := s.migrateFile(file); err != nil {
			return err
		}
		if err := s.rebuildIndex(file); err != nil {
			return err
		}
		return s.persistIndexFile()
	} else if info.Size() > 0 {
		log.Printf("aviso: %s com cabecalho incompleto, resetando", s.path)
		if err := file.Truncate(0); err != nil {
			return err
		}
	}

	if err := writeHeader(file, fileHeader{}); err != nil {
		return err
	}

	s.index.Reset()
	return s.persistIndexFile()
}

func (s *binaryEntityStore[T]) migrateFile(file *os.File) error {
	oldHeader, err := readHeader(file)
	if err != nil {
		return err
	}

	items, err := scanActiveRecords(file, s.codec)
	if err != nil {
		return err
	}

	if err := file.Truncate(0); err != nil {
		return err
	}

	if err := writeHeader(file, fileHeader{LastID: oldHeader.LastID, Count: int32(len(items))}); err != nil {
		return err
	}

	for _, item := range items {
		payload, err := s.codec.encode(item)
		if err != nil {
			return err
		}
		if _, err := appendRecord(file, false, s.getID(item), payload); err != nil {
			return err
		}
	}

	return nil
}

func (s *binaryEntityStore[T]) nextID() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return 0, err
	}

	header.LastID++
	if err := writeHeader(file, header); err != nil {
		return 0, err
	}

	return int(header.LastID), nil
}

func (s *binaryEntityStore[T]) createWithID(item T) (T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		var zero T
		return zero, err
	}

	payload, err := s.codec.encode(item)
	if err != nil {
		var zero T
		return zero, err
	}

	offset, err := appendRecord(file, false, s.getID(item), payload)
	if err != nil {
		var zero T
		return zero, err
	}
	s.index.Insert(s.getID(item), offset)

	header.Count++
	if err := writeHeader(file, header); err != nil {
		var zero T
		return zero, err
	}
	if err := s.persistIndexFile(); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}

func (s *binaryEntityStore[T]) Create(item T) (T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		var zero T
		return zero, err
	}

	header.LastID++
	s.setID(&item, int(header.LastID))

	payload, err := s.codec.encode(item)
	if err != nil {
		var zero T
		return zero, err
	}

	offset, err := appendRecord(file, false, int(header.LastID), payload)
	if err != nil {
		var zero T
		return zero, err
	}
	s.index.Insert(int(header.LastID), offset)

	header.Count++
	if err := writeHeader(file, header); err != nil {
		var zero T
		return zero, err
	}
	if err := s.persistIndexFile(); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}

func (s *binaryEntityStore[T]) GetByID(id int) (T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDONLY, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer file.Close()

	if _, err = readHeader(file); err != nil {
		var zero T
		return zero, err
	}

	offset, ok := s.index.Get(id)
	if !ok {
		var zero T
		return zero, domain.ErrNotFound
	}

	item, recordID, deleted, err := readRecordAt(file, offset, s.codec)
	if err == nil && !deleted && recordID == id {
		return item, nil
	}

	if err := s.rebuildIndex(file); err != nil {
		var zero T
		return zero, err
	}
	if err := s.persistIndexFile(); err != nil {
		var zero T
		return zero, err
	}

	offset, ok = s.index.Get(id)
	if !ok {
		var zero T
		return zero, domain.ErrNotFound
	}

	item, recordID, deleted, err = readRecordAt(file, offset, s.codec)
	if err != nil || deleted || recordID != id {
		var zero T
		return zero, domain.ErrNotFound
	}

	return item, nil
}

func (s *binaryEntityStore[T]) GetAll() ([]T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDONLY, 0o644)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	if _, err = readHeader(file); err != nil {
		return nil, err
	}

	return scanActiveRecords(file, s.codec)
}

func (s *binaryEntityStore[T]) Update(id int, item T) (T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		var zero T
		return zero, err
	}

	offset, ok := s.index.Get(id)
	if !ok {
		var zero T
		return zero, domain.ErrNotFound
	}

	_, recordID, deleted, err := readRecordAt(file, offset, s.codec)
	if err != nil || deleted || recordID != id {
		if err := s.rebuildIndex(file); err != nil {
			var zero T
			return zero, err
		}
		if err := s.persistIndexFile(); err != nil {
			var zero T
			return zero, err
		}
		offset, ok = s.index.Get(id)
		if !ok {
			var zero T
			return zero, domain.ErrNotFound
		}
	}

	if err := markDeletedAt(file, offset); err != nil {
		var zero T
		return zero, err
	}
	s.index.Delete(id)

	s.setID(&item, id)
	payload, err := s.codec.encode(item)
	if err != nil {
		var zero T
		return zero, err
	}
	newOffset, err := appendRecord(file, false, id, payload)
	if err != nil {
		var zero T
		return zero, err
	}
	s.index.Insert(id, newOffset)

	if err := writeHeader(file, header); err != nil {
		var zero T
		return zero, err
	}
	if err := s.persistIndexFile(); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}

func (s *binaryEntityStore[T]) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return err
	}

	offset, ok := s.index.Get(id)
	if !ok {
		return domain.ErrNotFound
	}

	_, recordID, deleted, err := readRecordAt(file, offset, s.codec)
	if err != nil || deleted || recordID != id {
		if err := s.rebuildIndex(file); err != nil {
			return err
		}
		if err := s.persistIndexFile(); err != nil {
			return err
		}
		offset, ok = s.index.Get(id)
		if !ok {
			return domain.ErrNotFound
		}
	}

	if err := markDeletedAt(file, offset); err != nil {
		return err
	}
	s.index.Delete(id)

	if header.Count > 0 {
		header.Count--
	}

	if err := writeHeader(file, header); err != nil {
		return err
	}

	return s.persistIndexFile()
}

func readHeader(file *os.File) (fileHeader, error) {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return fileHeader{}, err
	}

	buf := make([]byte, fileHeaderSize)
	if _, err := io.ReadFull(file, buf); err != nil {
		return fileHeader{}, err
	}

	return fileHeader{
		LastID: int32(binary.LittleEndian.Uint32(buf[1:5])),
		Count:  int32(binary.LittleEndian.Uint32(buf[5:9])),
	}, nil
}

func writeHeader(file *os.File, h fileHeader) error {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}

	buf := make([]byte, fileHeaderSize)
	buf[0] = fileVersion
	binary.LittleEndian.PutUint32(buf[1:5], uint32(h.LastID))
	binary.LittleEndian.PutUint32(buf[5:9], uint32(h.Count))

	_, err := file.Write(buf)
	return err
}

func appendRecord(file *os.File, deleted bool, id int, payload []byte) (int64, error) {
	offset, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return 0, err
	}

	tomb := byte(0)
	if deleted {
		tomb = 1
	}

	headerBuf := make([]byte, recordMetaSize)
	headerBuf[0] = tomb
	binary.LittleEndian.PutUint32(headerBuf[1:5], uint32(id))
	binary.LittleEndian.PutUint32(headerBuf[5:9], uint32(len(payload)))

	if _, err := file.Write(headerBuf); err != nil {
		return 0, err
	}

	_, err = file.Write(payload)
	if err != nil {
		return 0, err
	}

	return offset, nil
}

func (s *binaryEntityStore[T]) HashStats() HashIndexStats {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.index.Stats()
}

func (s *binaryEntityStore[T]) persistIndexFile() error {
	entries := s.index.Snapshot()
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Key < entries[j].Key
	})

	tempPath := s.indexPath + ".tmp"
	file, err := os.OpenFile(tempPath, os.O_CREATE|os.O_TRUNC|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}

	closeAndCleanup := func(retErr error) error {
		_ = file.Close()
		if retErr != nil {
			_ = os.Remove(tempPath)
		}
		return retErr
	}

	buf := make([]byte, indexHeaderSize)
	buf[0] = indexVersion
	binary.LittleEndian.PutUint32(buf[1:5], uint32(len(entries)))
	if _, err := file.Write(buf); err != nil {
		return closeAndCleanup(err)
	}

	entryBuf := make([]byte, indexEntrySize)
	for _, entry := range entries {
		binary.LittleEndian.PutUint32(entryBuf[0:4], uint32(entry.Key))
		binary.LittleEndian.PutUint64(entryBuf[4:12], uint64(entry.Offset))
		if _, err := file.Write(entryBuf); err != nil {
			return closeAndCleanup(err)
		}
	}

	if err := file.Sync(); err != nil {
		return closeAndCleanup(err)
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	if err := os.Rename(tempPath, s.indexPath); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	return nil
}

func (s *binaryEntityStore[T]) rebuildIndex(file *os.File) error {
	s.index.Reset()

	if _, err := file.Seek(fileHeaderSize, io.SeekStart); err != nil {
		return err
	}

	for {
		offset, err := file.Seek(0, io.SeekCurrent)
		if err != nil {
			return err
		}

		headerBuf := make([]byte, recordMetaSize)
		_, err = io.ReadFull(file, headerBuf)
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			return nil
		}
		if err != nil {
			return err
		}

		deleted := headerBuf[0] == 1
		recordID := int(binary.LittleEndian.Uint32(headerBuf[1:5]))
		size := binary.LittleEndian.Uint32(headerBuf[5:9])

		if _, err := file.Seek(int64(size), io.SeekCurrent); err != nil {
			return err
		}

		if deleted {
			s.index.Delete(recordID)
			continue
		}

		s.index.Insert(recordID, offset)
	}
}

func readRecordAt[T any](file *os.File, offset int64, codec payloadCodec[T]) (T, int, bool, error) {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		var zero T
		return zero, 0, false, err
	}

	headerBuf := make([]byte, recordMetaSize)
	if _, err := io.ReadFull(file, headerBuf); err != nil {
		var zero T
		return zero, 0, false, err
	}

	deleted := headerBuf[0] == 1
	recordID := int(binary.LittleEndian.Uint32(headerBuf[1:5]))
	size := binary.LittleEndian.Uint32(headerBuf[5:9])

	payload := make([]byte, size)
	if _, err := io.ReadFull(file, payload); err != nil {
		var zero T
		return zero, 0, false, err
	}

	if deleted {
		var zero T
		return zero, recordID, true, nil
	}

	item, err := codec.decode(payload, recordID)
	if err != nil {
		var zero T
		return zero, 0, false, err
	}

	return item, recordID, false, nil
}

func markDeletedAt(file *os.File, offset int64) error {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return err
	}
	_, err := file.Write([]byte{1})
	return err
}

func scanActiveRecords[T any](file *os.File, codec payloadCodec[T]) ([]T, error) {
	if _, err := file.Seek(fileHeaderSize, io.SeekStart); err != nil {
		return nil, err
	}

	items := make([]T, 0)
	for {
		headerBuf := make([]byte, recordMetaSize)
		_, err := io.ReadFull(file, headerBuf)
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			break
		}
		if err != nil {
			return nil, err
		}

		deleted := headerBuf[0] == 1
		recordID := int(binary.LittleEndian.Uint32(headerBuf[1:5]))
		size := binary.LittleEndian.Uint32(headerBuf[5:9])

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			return nil, err
		}

		if deleted {
			continue
		}

		item, err := codec.decode(payload, recordID)
		if err != nil {
			log.Printf("aviso: registro corrompido ignorado: %v", err)
			continue
		}
		items = append(items, item)
	}

	return items, nil
}

func findRecordByID[T any](
	file *os.File,
	id int,
	getID func(T) int,
	codec payloadCodec[T],
) (recordMeta, T, error) {
	if _, err := file.Seek(fileHeaderSize, io.SeekStart); err != nil {
		var zero T
		return recordMeta{}, zero, err
	}

	for {
		offset, err := file.Seek(0, io.SeekCurrent)
		if err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		headerBuf := make([]byte, recordMetaSize)
		_, err = io.ReadFull(file, headerBuf)
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			var zero T
			return recordMeta{}, zero, domain.ErrNotFound
		}
		if err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		deleted := headerBuf[0] == 1
		recordID := int(binary.LittleEndian.Uint32(headerBuf[1:5]))
		size := binary.LittleEndian.Uint32(headerBuf[5:9])

		if deleted || recordID != id {
			if _, err := file.Seek(int64(size), io.SeekCurrent); err != nil {
				var zero T
				return recordMeta{}, zero, err
			}
			continue
		}

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		item, err := codec.decode(payload, recordID)
		if err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		return recordMeta{Offset: offset, Size: size}, item, nil
	}
}
