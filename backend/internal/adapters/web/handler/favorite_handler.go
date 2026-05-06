package handler

import (
	"backend/internal/domain"
	favoriteuc "backend/internal/usecase/favorite"
	"encoding/json"
	"net/http"
	"strconv"
)

type FavoriteHandler struct {
	svc favoriteuc.Service
}

type favoriteRequest struct {
	UserID     int    `json:"idUsuario"`
	PropertyID int    `json:"idImovel"`
	CreatedAt  string `json:"dataCadastro"`
}

func NewFavoriteHandler(svc favoriteuc.Service) *FavoriteHandler {
	return &FavoriteHandler{svc: svc}
}

func (h *FavoriteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req favoriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	created, err := h.svc.Create(domain.Favorite{
		UserID:     req.UserID,
		PropertyID: req.PropertyID,
		CreatedAt:  req.CreatedAt,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *FavoriteHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, propertyID, ok := parseFavoritePathIDs(w, r)
	if !ok {
		return
	}
	item, err := h.svc.Get(userID, propertyID)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *FavoriteHandler) ListPropertiesByUser(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.PathValue("idUsuario"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	items, err := h.svc.GetPropertiesByUserID(userID)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *FavoriteHandler) ListUsersByProperty(w http.ResponseWriter, r *http.Request) {
	propertyID, err := strconv.Atoi(r.PathValue("idImovel"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	items, err := h.svc.GetUsersByPropertyID(propertyID)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *FavoriteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, propertyID, ok := parseFavoritePathIDs(w, r)
	if !ok {
		return
	}
	if err := h.svc.Delete(userID, propertyID); err != nil {
		respondDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseFavoritePathIDs(w http.ResponseWriter, r *http.Request) (int, int, bool) {
	userID, err := strconv.Atoi(r.PathValue("idUsuario"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return 0, 0, false
	}
	propertyID, err := strconv.Atoi(r.PathValue("idImovel"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return 0, 0, false
	}
	return userID, propertyID, true
}
