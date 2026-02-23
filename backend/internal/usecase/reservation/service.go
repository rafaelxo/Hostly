package reservation

import "backend/internal/domain"

type Service interface {
	Create(item domain.Reservation) (domain.Reservation, error)
	GetByID(id int) (domain.Reservation, error)
	GetAll() ([]domain.Reservation, error)
	GetByPropertyID(propertyID int) ([]domain.Reservation, error)
}

type service struct {
	repo         Repository
	propertyRepo PropertyReader
}

func NewService(repo Repository, propertyRepo PropertyReader) Service {
	return &service{repo: repo, propertyRepo: propertyRepo}
}
