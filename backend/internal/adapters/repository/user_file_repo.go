package repository

import (
	"strings"
	"backend/internal/domain"
)

type UserFileRepository struct {
	store *binaryEntityStore[domain.User]
}

func NewUserFileRepository(path string) (*UserFileRepository, error) {
	store, err := newBinaryEntityStore(
		path,
		func(u domain.User) int { return u.ID },
		func(u *domain.User, id int) { u.ID = id },
		userPayloadCodec(),
	)
	if err != nil {
		return nil, err
	}
	return &UserFileRepository{store: store}, nil
}

func (r *UserFileRepository) HashStats() HashIndexStats {
	return r.store.HashStats()
}

func (r *UserFileRepository) Create(item domain.User) (domain.User, error) {
	return r.store.Create(item)
}

func (r *UserFileRepository) GetByID(id int) (domain.User, error) {
	return r.store.GetByID(id)
}

func (r *UserFileRepository) GetByEmail(email string) (domain.User, error) {
	all, err := r.store.GetAll()
	if err != nil {
		return domain.User{}, err
	}

	normalized := strings.TrimSpace(strings.ToLower(email))
	for _, item := range all {
		if strings.ToLower(strings.TrimSpace(item.Email)) == normalized {
			return item, nil
		}
	}

	return domain.User{}, domain.ErrNotFound
}

func (r *UserFileRepository) GetAll() ([]domain.User, error) {
	return r.store.GetAll()
}

func (r *UserFileRepository) Update(id int, item domain.User) (domain.User, error) {
	return r.store.Update(id, item)
}

func (r *UserFileRepository) Delete(id int) error {
	return r.store.Delete(id)
}
