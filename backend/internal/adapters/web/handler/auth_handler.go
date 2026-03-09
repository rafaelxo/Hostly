package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"backend/internal/domain"
	authuc "backend/internal/usecase/auth"
)

type AuthHandler struct {
	svc authuc.Service
}

type registerRequest struct {
	Name     string `json:"nome"`
	Email    string `json:"email"`
	Password string `json:"senha"`
	AsHost   bool   `json:"comoAnfitriao"`
	Property *struct {
		Title       string   `json:"titulo"`
		Description string   `json:"descricao"`
		City        string   `json:"cidade"`
		DailyRate   float64  `json:"valorDiaria"`
		CreatedAt   string   `json:"dataCadastro"`
		Photos      []string `json:"fotos"`
		Active      bool     `json:"ativo"`
	} `json:"imovelInicial"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"senha"`
}

func NewAuthHandler(svc authuc.Service) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	var initialProperty *domain.Property
	if req.AsHost && req.Property != nil {
		initialProperty = &domain.Property{
			Title:       req.Property.Title,
			Description: req.Property.Description,
			City:        req.Property.City,
			DailyRate:   req.Property.DailyRate,
			CreatedAt:   req.Property.CreatedAt,
			Photos:      req.Property.Photos,
			Active:      req.Property.Active,
		}
	}

	session, err := h.svc.Register(authuc.RegisterInput{
		Name:            req.Name,
		Email:           req.Email,
		Password:        req.Password,
		CreateAsHost:    req.AsHost,
		InitialProperty: initialProperty,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, session)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	session, err := h.svc.Login(authuc.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, session)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		respondError(w, http.StatusUnauthorized, domain.ErrNotFound)
		return
	}

	user, err := h.svc.GetUserByToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err)
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func extractBearerToken(header string) string {
	trimmed := strings.TrimSpace(header)
	if trimmed == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(trimmed, prefix) {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(trimmed, prefix))
}
