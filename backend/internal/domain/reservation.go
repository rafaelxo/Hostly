package domain

import (
	"strings"
	"time"
)

type Reservation struct {
	ID         int     `json:"idReserva"`
	PropertyID int     `json:"idImovel"`
	GuestName  string  `json:"nomeHospede"`
	StartDate  string  `json:"dataInicio"`
	EndDate    string  `json:"dataFim"`
	TotalValue float64 `json:"valorTotal"`
}

func (r Reservation) Validate() error {
	if r.PropertyID <= 0 || strings.TrimSpace(r.GuestName) == "" || r.TotalValue < 0 {
		return ErrInvalidEntity
	}

	start, err := time.Parse("2006-01-02", r.StartDate)
	if err != nil {
		return ErrInvalidEntity
	}
	end, err := time.Parse("2006-01-02", r.EndDate)
	if err != nil {
		return ErrInvalidEntity
	}
	if end.Before(start) {
		return ErrInvalidEntity
	}
	return nil
}
