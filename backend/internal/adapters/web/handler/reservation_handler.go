package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
)

type createReservationRequest struct {
	PropertyID    int                  `json:"idImovel"`
	GuestID       int                  `json:"idHospede"`
	StartDate     string               `json:"dataInicio"`
	EndDate       string               `json:"dataFim"`
	PaymentMethod domain.PaymentMethod `json:"formaPagamento"`
}

type reservationUpdatePayload struct {
	PropertyID    *int                      `json:"idImovel"`
	GuestID       *int                      `json:"idHospede"`
	StartDate     *string                   `json:"dataInicio"`
	EndDate       *string                   `json:"dataFim"`
	PaymentMethod *domain.PaymentMethod     `json:"formaPagamento"`
	Status        *domain.ReservationStatus `json:"status"`
}

type confirmReservationPayload struct {
	PaymentMethod domain.PaymentMethod `json:"formaPagamento"`
}

type ReservationHandler struct {
	svc reservationuc.Service
}

func NewReservationHandler(svc reservationuc.Service) *ReservationHandler {
	return &ReservationHandler{svc: svc}
}

func (h *ReservationHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *ReservationHandler) ListByGuest(w http.ResponseWriter, r *http.Request) {
	guestID, err := strconv.Atoi(r.PathValue("idHospede"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	items, err := h.svc.GetByGuestID(guestID)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, items)
}

func (h *ReservationHandler) ListByHost(w http.ResponseWriter, r *http.Request) {
	hostID, err := strconv.Atoi(r.PathValue("idAnfitriao"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	items, err := h.svc.GetByHostID(hostID)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, items)
}

func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	payload := domain.Reservation{
		PropertyID:    req.PropertyID,
		GuestID:       req.GuestID,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		PaymentMethod: req.PaymentMethod,
	}
	created, err := h.svc.Create(payload)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *ReservationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	item, err := h.svc.GetByID(id)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *ReservationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	var payload reservationUpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	updated, err := h.svc.Update(id, reservationuc.ReservationUpdate(payload))
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *ReservationHandler) Confirm(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	var payload confirmReservationPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	confirmed, err := h.svc.Confirm(id, reservationuc.ConfirmReservationInput{
		PaymentMethod: payload.PaymentMethod,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, confirmed)
}

func (h *ReservationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	if err := h.svc.Delete(id); err != nil {
		respondDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
