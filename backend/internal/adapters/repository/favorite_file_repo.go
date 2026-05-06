package repository

import (
	"backend/internal/domain"
	"encoding/binary"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"
)

const favoriteRecordHeaderSize = 13

type FavoriteFileRepository struct {
	path         string
	byUserID     *multiExtensibleHashIndex
	byPropertyID *multiExtensibleHashIndex
	orderedByKey *bPlusTree
	mu           sync.Mutex
}

func NewFavoriteFileRepository(path string) (*FavoriteFileRepository, error) {
	repo := &FavoriteFileRepository{
		path:         path,
		orderedByKey: newBPlusTree(),
	}
	if err := repo.ensureFile(); err != nil {
		return nil, err
	}

	byUserID, err := newMultiExtensibleHashIndex(path+".byuser.ridx", 8)
	if err != nil {
		return nil, err
	}
	byPropertyID, err := newMultiExtensibleHashIndex(path+".byproperty.ridx", 8)
	if err != nil {
		return nil, err
	}
	repo.byUserID = byUserID
	repo.byPropertyID = byPropertyID

	if err := repo.rebuildIndexes(); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *FavoriteFileRepository) Create(item domain.Favorite) (domain.Favorite, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, err := r.findByPairLocked(item.UserID, item.PropertyID); err == nil {
		return domain.Favorite{}, domain.ErrAlreadyExists
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.Favorite{}, err
	}

	file, err := os.OpenFile(r.path, os.O_RDWR, 0o644)
	if err != nil {
		return domain.Favorite{}, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return domain.Favorite{}, err
	}
	offset, err := appendFavoriteRecord(file, item)
	if err != nil {
		return domain.Favorite{}, err
	}
	header.Count++
	if err := writeHeader(file, header); err != nil {
		return domain.Favorite{}, err
	}

	r.indexLocked(item, offset)
	r.syncIndexesLocked()
	return item, nil
}

func (r *FavoriteFileRepository) Get(userID, propertyID int) (domain.Favorite, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.findByPairLocked(userID, propertyID)
}

func (r *FavoriteFileRepository) GetByUserID(userID int) ([]domain.Favorite, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	offsets, ok := r.byUserID.Get(userID)
	if !ok {
		return []domain.Favorite{}, nil
	}
	return r.loadFavoritesByOffsetsLocked(offsets)
}

func (r *FavoriteFileRepository) GetByUserIDOrderedByPropertyID(userID int) ([]domain.Favorite, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	minKey := favoriteOrderKey(userID, 0)
	maxKey := favoriteOrderKey(userID, int(^uint32(0)))
	offsets := r.orderedByKey.Range(minKey, maxKey)
	return r.loadFavoritesByOffsetsLocked(offsets)
}

func (r *FavoriteFileRepository) GetByPropertyID(propertyID int) ([]domain.Favorite, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	offsets, ok := r.byPropertyID.Get(propertyID)
	if !ok {
		return []domain.Favorite{}, nil
	}
	return r.loadFavoritesByOffsetsLocked(offsets)
}

func (r *FavoriteFileRepository) Delete(userID, propertyID int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	item, offset, err := r.findByPairWithOffsetLocked(userID, propertyID)
	if err != nil {
		return err
	}

	file, err := os.OpenFile(r.path, os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return err
	}
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return err
	}
	if _, err := file.Write([]byte{1}); err != nil {
		return err
	}
	if header.Count > 0 {
		header.Count--
	}
	if err := writeHeader(file, header); err != nil {
		return err
	}

	r.unindexLocked(item, offset)
	r.syncIndexesLocked()
	return nil
}

func (r *FavoriteFileRepository) ensureFile() error {
	if err := os.MkdirAll(filepath.Dir(r.path), 0o755); err != nil {
		return err
	}
	file, err := os.OpenFile(r.path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}
	if info.Size() < fileHeaderSize {
		if err := file.Truncate(0); err != nil {
			return err
		}
		return writeHeader(file, fileHeader{Version: fileHeaderVersion})
	}

	header, err := readHeader(file)
	if err != nil || header.Version != fileHeaderVersion {
		if err := file.Truncate(0); err != nil {
			return err
		}
		return writeHeader(file, fileHeader{Version: fileHeaderVersion})
	}
	return nil
}

func (r *FavoriteFileRepository) rebuildIndexes() error {
	r.byUserID.Reset()
	r.byPropertyID.Reset()
	r.orderedByKey.Reset()

	items, err := r.scanAllWithOffsets()
	if err != nil {
		return err
	}
	for _, item := range items {
		r.indexLocked(item.favorite, item.offset)
	}
	return r.flushIndexes()
}

func (r *FavoriteFileRepository) flushIndexes() error {
	if err := r.byUserID.persistToFile(); err != nil {
		return err
	}
	return r.byPropertyID.persistToFile()
}

func (r *FavoriteFileRepository) syncIndexesLocked() {
	if err := r.flushIndexes(); err == nil {
		return
	}
	_ = r.rebuildIndexes()
}

func (r *FavoriteFileRepository) indexLocked(item domain.Favorite, offset int64) {
	r.byUserID.Insert(item.UserID, offset)
	r.byPropertyID.Insert(item.PropertyID, offset)
	r.orderedByKey.Insert(favoriteOrderKey(item.UserID, item.PropertyID), offset)
}

func (r *FavoriteFileRepository) unindexLocked(item domain.Favorite, offset int64) {
	r.byUserID.Delete(item.UserID, offset)
	r.byPropertyID.Delete(item.PropertyID, offset)
	r.orderedByKey.Delete(favoriteOrderKey(item.UserID, item.PropertyID), offset)
}

func (r *FavoriteFileRepository) findByPairLocked(userID, propertyID int) (domain.Favorite, error) {
	item, _, err := r.findByPairWithOffsetLocked(userID, propertyID)
	return item, err
}

func (r *FavoriteFileRepository) findByPairWithOffsetLocked(userID, propertyID int) (domain.Favorite, int64, error) {
	offsets, ok := r.byUserID.Get(userID)
	if !ok {
		return domain.Favorite{}, 0, domain.ErrNotFound
	}
	file, err := os.OpenFile(r.path, os.O_RDONLY, 0o644)
	if err != nil {
		return domain.Favorite{}, 0, err
	}
	defer file.Close()

	for _, offset := range offsets {
		item, deleted, err := readFavoriteAt(file, offset)
		if err != nil || deleted {
			continue
		}
		if item.UserID == userID && item.PropertyID == propertyID {
			return item, offset, nil
		}
	}
	return domain.Favorite{}, 0, domain.ErrNotFound
}

func (r *FavoriteFileRepository) loadFavoritesByOffsetsLocked(offsets []int64) ([]domain.Favorite, error) {
	file, err := os.OpenFile(r.path, os.O_RDONLY, 0o644)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	items := make([]domain.Favorite, 0, len(offsets))
	for _, offset := range offsets {
		item, deleted, err := readFavoriteAt(file, offset)
		if err != nil || deleted {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

type favoriteWithOffset struct {
	favorite domain.Favorite
	offset   int64
}

func (r *FavoriteFileRepository) scanAllWithOffsets() ([]favoriteWithOffset, error) {
	file, err := os.OpenFile(r.path, os.O_RDWR, 0o644)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	header, err := readHeader(file)
	if err != nil {
		return nil, err
	}
	activeCount := int32(0)
	items := make([]favoriteWithOffset, 0)

	if _, err := file.Seek(fileHeaderSize, io.SeekStart); err != nil {
		return nil, err
	}
	for {
		offset, err := file.Seek(0, io.SeekCurrent)
		if err != nil {
			return nil, err
		}
		item, deleted, err := readNextFavorite(file)
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if deleted {
			continue
		}
		activeCount++
		items = append(items, favoriteWithOffset{favorite: item, offset: offset})
	}

	if header.Count != activeCount {
		header.Count = activeCount
		if err := writeHeader(file, header); err != nil {
			return nil, err
		}
	}
	return items, nil
}

func appendFavoriteRecord(file *os.File, item domain.Favorite) (int64, error) {
	payload := encodeFavoritePayload(item)
	offset, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return 0, err
	}

	header := make([]byte, favoriteRecordHeaderSize)
	header[0] = 0
	binary.LittleEndian.PutUint32(header[1:5], uint32(int32(item.UserID)))
	binary.LittleEndian.PutUint32(header[5:9], uint32(int32(item.PropertyID)))
	binary.LittleEndian.PutUint32(header[9:13], uint32(len(payload)))
	if _, err := file.Write(header); err != nil {
		return 0, err
	}
	if _, err := file.Write(payload); err != nil {
		return 0, err
	}
	return offset, nil
}

func readFavoriteAt(file *os.File, offset int64) (domain.Favorite, bool, error) {
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return domain.Favorite{}, false, err
	}
	return readNextFavorite(file)
}

func readNextFavorite(file *os.File) (domain.Favorite, bool, error) {
	header := make([]byte, favoriteRecordHeaderSize)
	if _, err := io.ReadFull(file, header); err != nil {
		return domain.Favorite{}, false, err
	}

	deleted := header[0] == 1
	userID := int(int32(binary.LittleEndian.Uint32(header[1:5])))
	propertyID := int(int32(binary.LittleEndian.Uint32(header[5:9])))
	size := binary.LittleEndian.Uint32(header[9:13])
	payload := make([]byte, size)
	if _, err := io.ReadFull(file, payload); err != nil {
		return domain.Favorite{}, false, err
	}
	if deleted {
		return domain.Favorite{}, true, nil
	}

	item, err := decodeFavoritePayload(payload)
	if err != nil {
		return domain.Favorite{}, false, err
	}
	item.UserID = userID
	item.PropertyID = propertyID
	return item, false, nil
}

func encodeFavoritePayload(item domain.Favorite) []byte {
	createdAt := []byte(item.CreatedAt)
	payload := make([]byte, 5+len(createdAt))
	if item.Active {
		payload[0] = 1
	}
	binary.LittleEndian.PutUint32(payload[1:5], uint32(len(createdAt)))
	copy(payload[5:], createdAt)
	return payload
}

func decodeFavoritePayload(payload []byte) (domain.Favorite, error) {
	if len(payload) < 5 {
		return domain.Favorite{}, domain.ErrInvalidEntity
	}
	size := int(binary.LittleEndian.Uint32(payload[1:5]))
	if size < 0 || 5+size > len(payload) {
		return domain.Favorite{}, domain.ErrInvalidEntity
	}
	return domain.Favorite{
		CreatedAt: string(payload[5 : 5+size]),
		Active:    payload[0] == 1,
	}, nil
}

func favoriteOrderKey(userID, propertyID int) int64 {
	return int64(uint64(uint32(userID))<<32 | uint64(uint32(propertyID)))
}
