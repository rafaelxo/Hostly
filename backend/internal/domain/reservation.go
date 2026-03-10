package domain

import (
	"strings"
	"time"
)

type ReservationStatus string

const (
	ReservationStatusPending   ReservationStatus = "PENDENTE"
	ReservationStatusConfirmed ReservationStatus = "CONFIRMADA"
	ReservationStatusCancelled ReservationStatus = "CANCELADA"
)

type PaymentMethod string

const (
	PaymentMethodPIX        PaymentMethod = "PIX"
	PaymentMethodCreditCard PaymentMethod = "CARTAO_CREDITO"
	PaymentMethodDebitCard  PaymentMethod = "CARTAO_DEBITO"
	PaymentMethodBankSlip   PaymentMethod = "BOLETO"
	PaymentMethodCash       PaymentMethod = "DINHEIRO"
)

type PaymentStatus string

const (
	PaymentStatusNotStarted PaymentStatus = "NAO_INICIADO"
	PaymentStatusPending    PaymentStatus = "PENDENTE"
	PaymentStatusApproved   PaymentStatus = "APROVADO"
	PaymentStatusFailed     PaymentStatus = "FALHOU"
)

type Reservation struct {
	ID            int               `json:"idReserva"`
	PropertyID    int               `json:"idImovel"`
	GuestID       int               `json:"idHospede"`
	StartDate     string            `json:"dataInicio"`
	EndDate       string            `json:"dataFim"`
	TotalValue    float64           `json:"valorTotal"`
	Status        ReservationStatus `json:"status"`
	PaymentMethod PaymentMethod     `json:"formaPagamento"`
	PaymentStatus PaymentStatus     `json:"statusPagamento"`
	ConfirmedAt   string            `json:"confirmadaEm,omitempty"`
}

func (r *Reservation) SetDefaults() {
	if r.Status == "" {
		r.Status = ReservationStatusPending
	}
	if r.PaymentStatus == "" {
		r.PaymentStatus = PaymentStatusNotStarted
	}
	r.PaymentMethod = PaymentMethod(strings.TrimSpace(string(r.PaymentMethod)))
	if r.Status != ReservationStatusConfirmed {
		r.ConfirmedAt = ""
	}
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
	if !end.After(start) {
		return ErrInvalidEntity
	}

	if !isValidReservationStatus(r.Status) {
		return ErrInvalidEntity
	}

	if !isValidPaymentStatus(r.PaymentStatus) {
		return ErrInvalidEntity
	}

	if r.PaymentMethod != "" && !isValidPaymentMethod(r.PaymentMethod) {
		return ErrInvalidEntity
	}

	if r.Status == ReservationStatusConfirmed {
		if !isValidPaymentMethod(r.PaymentMethod) {
			return ErrInvalidEntity
		}
		if r.PaymentStatus != PaymentStatusApproved {
			return ErrInvalidEntity
		}
		if r.ConfirmedAt == "" {
			return ErrInvalidEntity
		}
		if _, err := time.Parse(time.RFC3339, r.ConfirmedAt); err != nil {
			return ErrInvalidEntity
		}
	}

	return nil
}

func isValidReservationStatus(value ReservationStatus) bool {
	switch value {
	case ReservationStatusPending, ReservationStatusConfirmed, ReservationStatusCancelled:
		return true
	default:
		return false
	}
}

func isValidPaymentStatus(value PaymentStatus) bool {
	switch value {
	case PaymentStatusNotStarted, PaymentStatusPending, PaymentStatusApproved, PaymentStatusFailed:
		return true
	default:
		return false
	}
}

func isValidPaymentMethod(value PaymentMethod) bool {
	switch value {
	case PaymentMethodPIX, PaymentMethodCreditCard, PaymentMethodDebitCard, PaymentMethodBankSlip, PaymentMethodCash:
		return true
	default:
		return false
	}
}
