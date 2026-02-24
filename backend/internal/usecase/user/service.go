package user

import "backend/internal/domain"

type Service interface {
	Create(item domain.User) (domain.User, error)
	GetByID(id int) (domain.User, error)
	GetAllHosts() ([]domain.User, error)
	GetAll() ([]domain.User, error)
	Update(id int, item domain.User) (domain.User, error)
	Patch(id int, p UserPatch) (domain.User, error)
	Delete(id int) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}
