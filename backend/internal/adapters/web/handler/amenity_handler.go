package handler

import (
	"net/http"

	amenityuc "backend/internal/usecase/amenity"
)

type AmenityHandler struct {
	svc amenityuc.Service
}

func NewAmenityHandler(svc amenityuc.Service) *AmenityHandler {
	return &AmenityHandler{svc: svc}
}

func (h *AmenityHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.GetAllActive()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}
