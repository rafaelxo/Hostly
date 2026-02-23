package repository

import (
	"bytes"
	"encoding/binary"
	"encoding/gob"
	"encoding/json"
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

type recordMeta struct {
	Offset int64
	Size   uint32
}

type binaryEntityStore[T any] struct {
	path  string
	getID func(T) int
	setID func(*T, int)
	mu    sync.Mutex
}

func newBinaryEntityStore[T any](path string, getID func(T) int, setID func(*T, int)) (*binaryEntityStore[T], error) {
	store := &binaryEntityStore[T]{
		path:  path,
		getID: getID,
		setID: setID,
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
		return nil
	}

	header := fileHeader{}
	return writeHeader(file, header)
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

	payload, err := encodePayload(item)
	if err != nil {
		var zero T
		return zero, err
	}

	if err := appendRecord(file, false, payload); err != nil {
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

	_, err = readHeader(file)
	if err != nil {
		var zero T
		return zero, err
	}

	items, err := scanActiveRecords[T](file)
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

	_, err = readHeader(file)
	if err != nil {
		return nil, err
	}

	return scanActiveRecords[T](file)
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

	meta, _, err := findRecordByID[T](file, id, s.getID)
	if err != nil {
		var zero T
		return zero, err
	}

	if err := markDeletedAt(file, meta.Offset); err != nil {
		var zero T
		return zero, err
	}

	s.setID(&item, id)
	payload, err := encodePayload(item)
	if err != nil {
		var zero T
		return zero, err
	}
	if err := appendRecord(file, false, payload); err != nil {
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

	meta, _, err := findRecordByID[T](file, id, s.getID)
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

func appendRecord(file *os.File, deleted bool, payload []byte) error {
	if _, err := file.Seek(0, io.SeekEnd); err != nil {
		return err
	}

	tomb := byte(0)
	if deleted {
		tomb = 1
	}

	if _, err := file.Write([]byte{tomb}); err != nil {
		return err
	}

	sizeBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(sizeBuf, uint32(len(payload)))
	if _, err := file.Write(sizeBuf); err != nil {
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

func scanActiveRecords[T any](file *os.File) ([]T, error) {
	if _, err := file.Seek(fileHeaderSize, io.SeekStart); err != nil {
		return nil, err
	}

	items := []T{}
	for {
		recordOffset, err := file.Seek(0, io.SeekCurrent)
		if err != nil {
			return nil, err
		}

		headerBuf := make([]byte, recordMetaSize)
		_, err = io.ReadFull(file, headerBuf)
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			break
		}
		if err != nil {
			return nil, err
		}

		_ = recordOffset
		deleted := headerBuf[0] == 1
		size := binary.LittleEndian.Uint32(headerBuf[1:5])

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			return nil, err
		}

		if deleted {
			continue
		}

		item, err := decodePayload[T](payload)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func findRecordByID[T any](file *os.File, id int, getID func(T) int) (recordMeta, T, error) {
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
		size := binary.LittleEndian.Uint32(headerBuf[1:5])

		payload := make([]byte, size)
		if _, err := io.ReadFull(file, payload); err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		if deleted {
			continue
		}

		item, err := decodePayload[T](payload)
		if err != nil {
			var zero T
			return recordMeta{}, zero, err
		}

		if getID(item) == id {
			return recordMeta{Offset: offset, Size: size}, item, nil
		}
	}
}

func encodePayload[T any](item T) ([]byte, error) {
	var buffer bytes.Buffer
	if err := gob.NewEncoder(&buffer).Encode(item); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func decodePayload[T any](payload []byte) (T, error) {
	var item T

	if err := gob.NewDecoder(bytes.NewReader(payload)).Decode(&item); err == nil {
		return item, nil
	}

	if err := json.Unmarshal(payload, &item); err != nil {
		var zero T
		return zero, err
	}

	return item, nil
}
