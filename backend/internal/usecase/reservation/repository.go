package reservation

import "backend/internal/domain"

type Repository interface {
	Create(item domain.Reservation) (domain.Reservation, error)
	GetByID(id int) (domain.Reservation, error)
	GetAll() ([]domain.Reservation, error)
	GetByPropertyID(propertyID int) ([]domain.Reservation, error)
}

type PropertyReader interface {
	GetByID(id int) (domain.Property, error)
}
