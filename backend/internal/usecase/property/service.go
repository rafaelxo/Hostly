package property

import "backend/internal/domain"

type Service interface {
	Create(item domain.Property) (domain.Property, error)
	GetByID(id int) (domain.Property, error)
	GetAll() ([]domain.Property, error)
	GetByOwnerID(ownerID int) ([]domain.Property, error)
	Update(id int, item domain.Property) (domain.Property, error)
	Patch(id int, p PropertyPatch) (domain.Property, error)
	Delete(id int) error
}

type service struct {
	repo     Repository
	userRepo UserReader
}

func NewService(repo Repository, userRepo UserReader) Service {
	return &service{repo: repo, userRepo: userRepo}
}
