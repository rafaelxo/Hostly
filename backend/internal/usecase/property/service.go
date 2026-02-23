package property

import "backend/internal/domain"

type Service interface {
	Create(item domain.Property) (domain.Property, error)
	GetByID(id int) (domain.Property, error)
	GetAll() ([]domain.Property, error)
	Update(id int, item domain.Property) (domain.Property, error)
	Delete(id int) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}


