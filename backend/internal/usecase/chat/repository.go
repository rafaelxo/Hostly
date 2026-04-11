package chat

import "backend/internal/domain"

type Repository interface {
	Create(item domain.ChatMessage) (domain.ChatMessage, error)
	GetByID(id int) (domain.ChatMessage, error)
	GetAll() ([]domain.ChatMessage, error)
	Update(id int, item domain.ChatMessage) (domain.ChatMessage, error)
	Delete(id int) error
}

type UserReader interface {
	GetByID(id int) (domain.User, error)
	GetAll() ([]domain.User, error)
}

type ReservationReader interface {
	GetAll() ([]domain.Reservation, error)
}

type PropertyReader interface {
	GetByID(id int) (domain.Property, error)
	GetAll() ([]domain.Property, error)
}
