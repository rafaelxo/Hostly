package repository

import (
	"encoding/binary"
	"io"
	"os"
	"path/filepath"
	"sync"

	"backend/internal/domain"
)

const (
	fileHeaderSize = 8
	recordMetaSize = 5
)

type fileHeader struct {
	LastID int32
	Count  int32
}

type payloadCodec[T any] struct {
	encode func(T) ([]byte, error)
	decode func([]byte) (T, error)
}

type binaryEntityStore[T any] struct {
	path  string
	getID func(T) int
	setID func(*T, int)
	codec payloadCodec[T]
	index *primaryIndex
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

	idx, err := newPrimaryIndex(path + ".idx")
	if err != nil {
		return nil, err
	}
	store.index = idx

	if len(idx.entries) == 0 {
		if err := store.rebuildIndex(); err != nil {
			return nil, err
		}
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
		return nil
	}

	return writeHeader(file, fileHeader{})
}

func (s *binaryEntityStore[T]) rebuildIndex() error {
	file, err := os.OpenFile(s.path, os.O_RDONLY, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	entries := map[int]int64{}
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
			break
		}
		if err != nil {
			return err
		}

		deleted := headerBuf[0] == 1
		size := binary.LittleEndian.Uint32(headerBuf[1:5])

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			return err
		}

		if deleted {
			continue
		}

		item, err := s.codec.decode(payload)
		if err != nil {
			return err
		}
		entries[s.getID(item)] = offset
	}

	return s.index.Rebuild(entries)
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

	offset, err := appendRecord(file, false, payload)
	if err != nil {
		var zero T
		return zero, err
	}

	header.Count++
	if err := writeHeader(file, header); err != nil {
		var zero T
		return zero, err
	}

	if err := s.index.Put(int(header.LastID), offset); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}

func (s *binaryEntityStore[T]) GetByID(id int) (T, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	offset, ok := s.index.Get(id)
	if !ok {
		var zero T
		return zero, domain.ErrNotFound
	}

	file, err := os.OpenFile(s.path, os.O_RDONLY, 0o644)
	if err != nil {
		var zero T
		return zero, err
	}
	defer file.Close()

	return readRecordAt(file, offset, s.codec)
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

	oldOffset, ok := s.index.Get(id)
	if !ok {
		var zero T
		return zero, domain.ErrNotFound
	}

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

	if err := markDeletedAt(file, oldOffset); err != nil {
		var zero T
		return zero, err
	}

	s.setID(&item, id)
	payload, err := s.codec.encode(item)
	if err != nil {
		var zero T
		return zero, err
	}
	newOffset, err := appendRecord(file, false, payload)
	if err != nil {
		var zero T
		return zero, err
	}

	if err := writeHeader(file, header); err != nil {
		var zero T
		return zero, err
	}

	if err := s.index.Put(id, newOffset); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}

func (s *binaryEntityStore[T]) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	offset, ok := s.index.Get(id)
	if !ok {
		return domain.ErrNotFound
	}

	file, err := os.OpenFile(s.path, os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return err
	}

	if err := markDeletedAt(file, offset); err != nil {
		return err
	}

	if header.Count > 0 {
		header.Count--
	}

	if err := writeHeader(file, header); err != nil {
		return err
	}

	return s.index.Delete(id)
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
		LastID: int32(binary.LittleEndian.Uint32(buf[0:4])),
		Count:  int32(binary.LittleEndian.Uint32(buf[4:8])),
	}, nil
}

func writeHeader(file *os.File, h fileHeader) error {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}

	buf := make([]byte, fileHeaderSize)
	binary.LittleEndian.PutUint32(buf[0:4], uint32(h.LastID))
	binary.LittleEndian.PutUint32(buf[4:8], uint32(h.Count))

	_, err := file.Write(buf)
	return err
}

func appendRecord(file *os.File, deleted bool, payload []byte) (int64, error) {
	offset, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return 0, err
	}

	tomb := byte(0)
	if deleted {
		tomb = 1
	}

	if _, err := file.Write([]byte{tomb}); err != nil {
		return 0, err
	}

	sizeBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(sizeBuf, uint32(len(payload)))
	if _, err := file.Write(sizeBuf); err != nil {
		return 0, err
	}

	if _, err := file.Write(payload); err != nil {
		return 0, err
	}
	return offset, nil
}

func markDeletedAt(file *os.File, offset int64) error {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return err
	}
	_, err := file.Write([]byte{1})
	return err
}

func readRecordAt[T any](file *os.File, offset int64, codec payloadCodec[T]) (T, error) {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		var zero T
		return zero, err
	}

	headerBuf := make([]byte, recordMetaSize)
	if _, err := io.ReadFull(file, headerBuf); err != nil {
		var zero T
		return zero, err
	}

	if headerBuf[0] == 1 {
		var zero T
		return zero, domain.ErrNotFound
	}

	size := binary.LittleEndian.Uint32(headerBuf[1:5])
	payload := make([]byte, size)
	if _, err := io.ReadFull(file, payload); err != nil {
		var zero T
		return zero, err
	}

	return codec.decode(payload)
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
		size := binary.LittleEndian.Uint32(headerBuf[1:5])

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			return nil, err
		}

		if deleted {
			continue
		}

		item, err := codec.decode(payload)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}
