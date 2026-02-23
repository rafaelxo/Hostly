package property

import "backend/internal/domain"

type Repository interface {
	Create(item domain.Property) (domain.Property, error)
	GetByID(id int) (domain.Property, error)
	GetAll() ([]domain.Property, error)
	Update(id int, item domain.Property) (domain.Property, error)
	Delete(id int) error
}


