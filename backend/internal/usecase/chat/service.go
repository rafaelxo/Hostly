package chat

import "backend/internal/domain"

type Service interface {
	Send(item domain.ChatMessage) (domain.ChatMessage, error)
	ListForUser(userID int, withUserID *int, propertyID *int) ([]domain.ChatMessage, error)
	ListAllowedContacts(userID int) ([]domain.User, error)
}

type service struct {
	repo            Repository
	userRepo        UserReader
	reservationRepo ReservationReader
	propertyRepo    PropertyReader
}

func NewService(repo Repository, userRepo UserReader, reservationRepo ReservationReader, propertyRepo PropertyReader) Service {
	return &service{repo: repo, userRepo: userRepo, reservationRepo: reservationRepo, propertyRepo: propertyRepo}
}
