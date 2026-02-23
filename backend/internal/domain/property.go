package domain

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound      = errors.New("registro nao encontrado")
	ErrInvalidEntity = errors.New("entidade invalida")
)

type Property struct {
	ID           int      `json:"idImovel"`
	UserID       int      `json:"idUsuario"`
	Title        string   `json:"titulo"`
	Description  string   `json:"descricao"`
	City         string   `json:"cidade"`
	DailyRate    float64  `json:"valorDiaria"`
	CreatedAt    string   `json:"dataCadastro"`
	Photos       []string `json:"fotos"`
	Active       bool     `json:"ativo"`
}

func (p Property) Validate() error {
	if p.UserID <= 0 || strings.TrimSpace(p.Title) == "" || strings.TrimSpace(p.City) == "" || p.DailyRate < 0 {
		return ErrInvalidEntity
	}

	if p.CreatedAt == "" {
		return nil
	}

	if _, err := time.Parse("2006-01-02", p.CreatedAt); err != nil {
		return ErrInvalidEntity
	}

	return nil
}

