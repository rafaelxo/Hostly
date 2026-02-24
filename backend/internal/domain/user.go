package domain

import "strings"

type UserType string

const (
	UserTypeAdmin     UserType = "ADMIN"
	UserTypeHost      UserType = "ANFITRIAO"
)

type User struct {
	ID       int      `json:"idUsuario"`
	Name     string   `json:"nome"`
	Email    string   `json:"email"`
	Password string   `json:"-"`
	Type     UserType `json:"tipo"`
	Active   bool     `json:"ativo"`
}

func (u User) Validate() error {
	if strings.TrimSpace(u.Name) == "" || strings.TrimSpace(u.Email) == "" {
		return ErrInvalidEntity
	}
	if u.Type != UserTypeAdmin && u.Type != UserTypeHost {
		return ErrInvalidEntity
	}
	return nil
}
