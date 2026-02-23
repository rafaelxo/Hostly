package repository

import (
	"backend/internal/domain"
	"backend/internal/usecase/property"
)

type PropertyFileRepository struct {
	store *binaryEntityStore[domain.Property]
}

func NewPropertyFileRepository(path string) (property.Repository, error) {
	store, err := newBinaryEntityStore[domain.Property](
		path,
		func(p domain.Property) int { return p.ID },
		func(p *domain.Property, id int) { p.ID = id },
	)
	if err != nil {
		return nil, err
	}
	return &PropertyFileRepository{store: store}, nil
}

func (r *PropertyFileRepository) Create(item domain.Property) (domain.Property, error) {
	return r.store.Create(item)
}

func (r *PropertyFileRepository) GetByID(id int) (domain.Property, error) {
	return r.store.GetByID(id)
}

func (r *PropertyFileRepository) GetAll() ([]domain.Property, error) {
	return r.store.GetAll()
}

func (r *PropertyFileRepository) Update(id int, item domain.Property) (domain.Property, error) {
	return r.store.Update(id, item)
}

func (r *PropertyFileRepository) Delete(id int) error {
	return r.store.Delete(id)
}
