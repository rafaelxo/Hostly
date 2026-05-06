package favorite

import "backend/internal/domain"

type Repository interface {
	Create(item domain.Favorite) (domain.Favorite, error)
	Get(userID, propertyID int) (domain.Favorite, error)
	GetByUserID(userID int) ([]domain.Favorite, error)
	GetByUserIDOrderedByPropertyID(userID int) ([]domain.Favorite, error)
	GetByPropertyID(propertyID int) ([]domain.Favorite, error)
	Delete(userID, propertyID int) error
}

type UserReader interface {
	GetByID(id int) (domain.User, error)
}

type PropertyReader interface {
	GetByID(id int) (domain.Property, error)
}
