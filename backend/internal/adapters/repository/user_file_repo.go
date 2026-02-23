package repository

import (
	"backend/internal/domain"
	useruc "backend/internal/usecase/user"
)

type UserFileRepository struct {
	store *binaryEntityStore[domain.User]
}

func NewUserFileRepository(path string) (useruc.Repository, error) {
	store, err := newBinaryEntityStore[domain.User](
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

func (r *UserFileRepository) Create(item domain.User) (domain.User, error) {
	return r.store.Create(item)
}

func (r *UserFileRepository) GetByID(id int) (domain.User, error) {
	return r.store.GetByID(id)
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
