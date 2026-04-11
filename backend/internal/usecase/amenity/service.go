package amenity

import "backend/internal/domain"

type Service interface {
	GetAllActive() ([]domain.AmenityCatalogItem, error)
	SeedCommonAmenities() error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}
