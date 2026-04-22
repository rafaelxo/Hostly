package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
)

type createReservationRequest struct {
	PropertyID int     `json:"idImovel"`
	GuestID    int     `json:"idHospede"`
	StartDate  string  `json:"dataInicio"`
	EndDate    string  `json:"dataFim"`
	TotalValue float64 `json:"valorTotal"`
}

type reservationUpdatePayload struct {
	PropertyID *int     `json:"idImovel"`
	GuestID    *int     `json:"idHospede"`
	StartDate  *string  `json:"dataInicio"`
	EndDate    *string  `json:"dataFim"`
	TotalValue *float64 `json:"valorTotal"`
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

func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	payload := domain.Reservation{
		PropertyID: req.PropertyID,
		GuestID:    req.GuestID,
		StartDate:  req.StartDate,
		EndDate:    req.EndDate,
		TotalValue: req.TotalValue,
	}
	created, err := h.svc.Create(payload)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *ReservationHandler) ListByProperty(w http.ResponseWriter, r *http.Request) {
	propertyID, err := strconv.Atoi(r.PathValue("imovelId"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	items, err := h.svc.GetByPropertyID(propertyID)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
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