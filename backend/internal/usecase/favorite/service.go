package favorite

import "backend/internal/domain"

type Service interface {
	Create(item domain.Favorite) (domain.Favorite, error)
	Get(userID, propertyID int) (domain.Favorite, error)
	GetPropertiesByUserID(userID int) ([]domain.Property, error)
	GetUsersByPropertyID(propertyID int) ([]domain.User, error)
	Delete(userID, propertyID int) error
}

type service struct {
	repo         Repository
	userRepo     UserReader
	propertyRepo PropertyReader
}

func NewService(repo Repository, userRepo UserReader, propertyRepo PropertyReader) Service {
	return &service{repo: repo, userRepo: userRepo, propertyRepo: propertyRepo}
}
