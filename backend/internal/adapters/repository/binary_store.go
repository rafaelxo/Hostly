package repository

import (
	"backend/internal/domain"
	"encoding/binary"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
)

const (
	fileVersion    = uint8(3)
	fileHeaderSize = 9
	recordMetaSize = 9
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
	path  string
	getID func(T) int
	setID func(*T, int)
	codec payloadCodec[T]
	mu    sync.Mutex
}

func newBinaryEntityStore[T any](
	path string,
	getID func(T) int,
	setID func(*T, int),
	codec payloadCodec[T],
) (*binaryEntityStore[T], error) {
	store := &binaryEntityStore[T]{
		path:  path,
		getID: getID,
		setID: setID,
		codec: codec,
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
			return nil
		}
		log.Printf("aviso: %s em formato antigo, migrando para versao %d", s.path, fileVersion)
		return s.migrateFile(file)
	} else if info.Size() > 0 {
		log.Printf("aviso: %s com cabecalho incompleto, resetando", s.path)
		if err := file.Truncate(0); err != nil {
			return err
		}
	}

	return writeHeader(file, fileHeader{})
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
		if err := appendRecord(file, false, s.getID(item), payload); err != nil {
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

	if err := appendRecord(file, false, s.getID(item), payload); err != nil {
		var zero T
		return zero, err
	}

	header.Count++
	if err := writeHeader(file, header); err != nil {
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

	if err := appendRecord(file, false, int(header.LastID), payload); err != nil {
		var zero T
		return zero, err
	}

	header.Count++
	if err := writeHeader(file, header); err != nil {
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

	items, err := scanActiveRecords(file, s.codec)
	if err != nil {
		var zero T
		return zero, err
	}

	for _, item := range items {
		if s.getID(item) == id {
			return item, nil
		}
	}

	var zero T
	return zero, domain.ErrNotFound
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

	meta, _, err := findRecordByID(file, id, s.getID, s.codec)
	if err != nil {
		var zero T
		return zero, err
	}

	if err := markDeletedAt(file, meta.Offset); err != nil {
		var zero T
		return zero, err
	}

	s.setID(&item, id)
	payload, err := s.codec.encode(item)
	if err != nil {
		var zero T
		return zero, err
	}
	if err := appendRecord(file, false, id, payload); err != nil {
		var zero T
		return zero, err
	}

	if err := writeHeader(file, header); err != nil {
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

	meta, _, err := findRecordByID(file, id, s.getID, s.codec)
	if err != nil {
		return err
	}

	if err := markDeletedAt(file, meta.Offset); err != nil {
		return err
	}

	if header.Count > 0 {
		header.Count--
	}

	return writeHeader(file, header)
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

func appendRecord(file *os.File, deleted bool, id int, payload []byte) error {
	if _, err := file.Seek(0, io.SeekEnd); err != nil {
		return err
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
		return err
	}

	_, err := file.Write(payload)
	return err
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
