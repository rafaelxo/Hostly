package repository

import (
	"backend/internal/domain"
	"errors"
	"sync"
)

type PropertyFileRepository struct {
	store    *binaryEntityStore[domain.Property]
	byUserID *multiExtensibleHashIndex
	mu       sync.Mutex
}

func NewPropertyFileRepository(path string) (*PropertyFileRepository, error) {
	store, err := newBinaryEntityStore(
		path,
		func(p domain.Property) int { return p.ID },
		func(p *domain.Property, id int) { p.ID = id },
		propertyPayloadCodec(),
	)
	if err != nil {
		return nil, err
	}

	byUserID, err := newMultiExtensibleHashIndex(path+".byuser.ridx", 8)
	if err != nil {
		return nil, err
	}

	repo := &PropertyFileRepository{store: store, byUserID: byUserID}
	if err := repo.rebuildByUserIndex(); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *PropertyFileRepository) HashStats() HashIndexStats {
	return r.store.HashStats()
}

func (r *PropertyFileRepository) Create(item domain.Property) (domain.Property, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created, err := r.store.Create(item)
	if err != nil {
		return domain.Property{}, err
	}
	r.byUserID.Insert(created.UserID, int64(created.ID))
	r.syncRelationIndexLocked()
	return created, nil
}

func (r *PropertyFileRepository) GetByID(id int) (domain.Property, error) {
	return r.store.GetByID(id)
}

func (r *PropertyFileRepository) GetAll() ([]domain.Property, error) {
	return r.store.GetAll()
}

func (r *PropertyFileRepository) GetByOwnerID(ownerID int) ([]domain.Property, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	ids, ok := r.byUserID.Get(ownerID)
	if !ok {
		return []domain.Property{}, nil
	}
	items := make([]domain.Property, 0, len(ids))
	dirty := false
	for _, id := range ids {
		item, err := r.store.GetByID(int(id))
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				r.byUserID.Delete(ownerID, id)
				dirty = true
				continue
			}
			return nil, err
		}
		items = append(items, item)
	}
	if dirty {
		r.syncRelationIndexLocked()
	}
	return items, nil
}

func (r *PropertyFileRepository) Update(id int, item domain.Property) (domain.Property, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, err := r.store.GetByID(id)
	if err != nil {
		return domain.Property{}, err
	}
	updated, err := r.store.Update(id, item)
	if err != nil {
		return domain.Property{}, err
	}
	if existing.UserID != updated.UserID {
		r.byUserID.Delete(existing.UserID, int64(existing.ID))
		r.byUserID.Insert(updated.UserID, int64(updated.ID))
		r.syncRelationIndexLocked()
	}
	return updated, nil
}

func (r *PropertyFileRepository) Delete(id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, err := r.store.GetByID(id)
	if err != nil {
		return err
	}
	if err := r.store.Delete(id); err != nil {
		return err
	}
	r.byUserID.Delete(existing.UserID, int64(existing.ID))
	r.syncRelationIndexLocked()
	return nil
}

func (r *PropertyFileRepository) rebuildByUserIndex() error {
	r.byUserID.Reset()
	items, err := r.store.GetAll()
	if err != nil {
		return err
	}
	for _, item := range items {
		r.byUserID.Insert(item.UserID, int64(item.ID))
	}
	return r.byUserID.persistToFile()
}

func (r *PropertyFileRepository) syncRelationIndexLocked() {
	if err := r.byUserID.persistToFile(); err == nil {
		return
	}
	_ = r.rebuildByUserIndex()
}
