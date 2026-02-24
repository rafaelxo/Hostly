package domain

import (
	"time"
)

type Reservation struct {
	ID         int     `json:"idReserva"`
	PropertyID int     `json:"idImovel"`
	GuestID    int     `json:"idHospede"`
	StartDate  string  `json:"dataInicio"`
	EndDate    string  `json:"dataFim"`
	TotalValue float64 `json:"valorTotal"`
	
}

func (r Reservation) Validate() error {
	if r.PropertyID <= 0 || r.TotalValue < 0 || r.GuestID <= 0 {
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
