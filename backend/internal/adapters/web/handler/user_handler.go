package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"backend/internal/domain"
	useruc "backend/internal/usecase/user"
)

type createUserRequest struct {
	Name     string          `json:"nome"`
	Email    string          `json:"email"`
	Password string          `json:"senha"`
	Type     domain.UserType `json:"tipo"`
	Active   bool            `json:"ativo"`
}

type userUpdatePayload struct {
	Name     *string          `json:"nome"`
	Email    *string          `json:"email"`
	Password *string          `json:"senha"`
	Type     *domain.UserType `json:"tipo"`
	Active   *bool            `json:"ativo"`
}

type UserHandler struct {
	svc useruc.Service
}

func NewUserHandler(svc useruc.Service) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	payload := domain.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Type:     req.Type,
		Active:   req.Active,
	}
	created, err := h.svc.Create(payload)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *UserHandler) ListHosts(w http.ResponseWriter, r *http.Request) {
	hosts, err := h.svc.GetAllHosts()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, hosts)
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	user, err := h.svc.GetByID(id)
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, user)
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.svc.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, users)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	var payload userUpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}
	updated, err := h.svc.Patch(id, useruc.UserPatch{
		Name:     payload.Name,
		Email:    payload.Email,
		Password: payload.Password,
		Type:     payload.Type,
		Active:   payload.Active,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
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
