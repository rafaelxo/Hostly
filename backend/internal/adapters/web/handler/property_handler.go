package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/internal/domain"
	"backend/internal/usecase/property"
)

type createPropertyRequest struct {
	UserID      int      `json:"idUsuario"`
	Title       string   `json:"titulo"`
	Description string   `json:"descricao"`
	City        string   `json:"cidade"`
	DailyRate   float64  `json:"valorDiaria"`
	CreatedAt   string   `json:"dataCadastro"`
	Photos      []string `json:"fotos"`
	Active      bool     `json:"ativo"`
}

type propertyUpdatePayload struct {
	UserID      *int      `json:"idUsuario"`
	Title       *string   `json:"titulo"`
	Description *string   `json:"descricao"`
	City        *string   `json:"cidade"`
	DailyRate   *float64  `json:"valorDiaria"`
	CreatedAt   *string   `json:"dataCadastro"`
	Photos      *[]string `json:"fotos"`
	Active      *bool     `json:"ativo"`
}

type PropertyHandler struct {
	svc property.Service
}

func NewPropertyHandler(svc property.Service) *PropertyHandler {
	return &PropertyHandler{svc: svc}
}

func (h *PropertyHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *PropertyHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createPropertyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	payload := domain.Property{
		UserID:      req.UserID,
		Title:       req.Title,
		Description: req.Description,
		City:        req.City,
		DailyRate:   req.DailyRate,
		CreatedAt:   req.CreatedAt,
		Photos:      req.Photos,
		Active:      req.Active,
	}
	created, err := h.svc.Create(payload)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *PropertyHandler) GetByID(w http.ResponseWriter, r *http.Request) {
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

func (h *PropertyHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	var payload propertyUpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	updated, err := h.svc.Patch(id, property.PropertyPatch(payload))
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *PropertyHandler) Delete(w http.ResponseWriter, r *http.Request) {
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
