package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
	useruc "backend/internal/usecase/user"
	"backend/internal/usecase/property"
)

type Dependencies struct {
	PropertyService    property.Service
	UserService        useruc.Service
	ReservationService reservationuc.Service
}

type Handler struct {
	propertyService    property.Service
	userService        useruc.Service
	reservationService reservationuc.Service
}

func NewHandler(deps Dependencies) *Handler {
	return &Handler{
		propertyService:    deps.PropertyService,
		userService:        deps.UserService,
		reservationService: deps.ReservationService,
	}
}

type dashboardStats struct {
	TotalProperties int     `json:"totalImoveis"`
	TotalHosts      int     `json:"totalAnfitrioes"`
	ActiveBookings  int     `json:"reservasAtivas"`
	TotalRevenue    float64 `json:"receitaTotal"`
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

type userUpdatePayload struct {
	Name     *string          `json:"nome"`
	Email    *string          `json:"email"`
	Password *string          `json:"senha"`
	Type     *domain.UserType `json:"tipo"`
	Active   *bool            `json:"ativo"`
}

func (h *Handler) HandleProperties(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.propertyService.GetAll()
		if err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
		respondJSON(w, http.StatusOK, items)
	case http.MethodPost:
		var payload domain.Property
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			respondError(w, http.StatusBadRequest, err)
			return
		}
		created, err := h.propertyService.Create(payload)
		if err != nil {
			respondDomainError(w, err)
			return
		}
		respondJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) HandlePropertyByID(w http.ResponseWriter, r *http.Request) {
	id, err := readID(r.URL.Path, "/imoveis/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	switch r.Method {
	case http.MethodGet:
		item, err := h.propertyService.GetByID(id)
		if err != nil {
			respondDomainError(w, err)
			return
		}
		respondJSON(w, http.StatusOK, item)
	case http.MethodPut:
		existing, err := h.propertyService.GetByID(id)
		if err != nil {
			respondDomainError(w, err)
			return
		}

		var payload propertyUpdatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			respondError(w, http.StatusBadRequest, err)
			return
		}

		if payload.UserID != nil {
			existing.UserID = *payload.UserID
		}
		if payload.Title != nil {
			existing.Title = *payload.Title
		}
		if payload.Description != nil {
			existing.Description = *payload.Description
		}
		if payload.City != nil {
			existing.City = *payload.City
		}
		if payload.DailyRate != nil {
			existing.DailyRate = *payload.DailyRate
		}
		if payload.CreatedAt != nil {
			existing.CreatedAt = *payload.CreatedAt
		}
		if payload.Photos != nil {
			existing.Photos = *payload.Photos
		}
		if payload.Active != nil {
			existing.Active = *payload.Active
		}

		updated, err := h.propertyService.Update(id, existing)
		if err != nil {
			respondDomainError(w, err)
			return
		}
		respondJSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		if err := h.propertyService.Delete(id); err != nil {
			respondDomainError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) HandleUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var payload domain.User
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	created, err := h.userService.Create(payload)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

func (h *Handler) HandleUsersHosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	hosts, err := h.userService.GetAllHosts()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	respondJSON(w, http.StatusOK, hosts)
}

func (h *Handler) HandleUserByID(w http.ResponseWriter, r *http.Request) {
	id, err := readID(r.URL.Path, "/usuarios/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	switch r.Method {
	case http.MethodPut:
		existing, err := h.userService.GetByID(id)
		if err != nil {
			respondDomainError(w, err)
			return
		}

		var payload userUpdatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			respondError(w, http.StatusBadRequest, err)
			return
		}

		if payload.Name != nil {
			existing.Name = *payload.Name
		}
		if payload.Email != nil {
			existing.Email = *payload.Email
		}
		if payload.Password != nil {
			existing.Password = *payload.Password
		}
		if payload.Type != nil {
			existing.Type = *payload.Type
		}
		if payload.Active != nil {
			existing.Active = *payload.Active
		}

		updated, err := h.userService.Update(id, existing)
		if err != nil {
			respondDomainError(w, err)
			return
		}
		respondJSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		if err := h.userService.Delete(id); err != nil {
			respondDomainError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) HandleReservations(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		propertyID := r.URL.Query().Get("idImovel")
		if propertyID != "" {
			id, err := strconv.Atoi(propertyID)
			if err != nil {
				respondError(w, http.StatusBadRequest, err)
				return
			}
			items, err := h.reservationService.GetByPropertyID(id)
			if err != nil {
				respondDomainError(w, err)
				return
			}
			respondJSON(w, http.StatusOK, items)
			return
		}

		items, err := h.reservationService.GetAll()
		if err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
		respondJSON(w, http.StatusOK, items)
	case http.MethodPost:
		var payload domain.Reservation
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			respondError(w, http.StatusBadRequest, err)
			return
		}
		created, err := h.reservationService.Create(payload)
		if err != nil {
			respondDomainError(w, err)
			return
		}
		respondJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) HandleReservationByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	id, err := readID(r.URL.Path, "/reservas/")
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	item, err := h.reservationService.GetByID(id)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, item)
}

func (h *Handler) HandleDashboardStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	properties, err := h.propertyService.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	hosts, err := h.userService.GetAllHosts()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	reservations, err := h.reservationService.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	stats := dashboardStats{
		TotalHosts:     len(hosts),
		ActiveBookings: len(reservations),
	}

	for _, propertyItem := range properties {
		if propertyItem.Active {
			stats.TotalProperties++
		}
	}
	for _, reservationItem := range reservations {
		stats.TotalRevenue += reservationItem.TotalValue
	}

	respondJSON(w, http.StatusOK, stats)
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, err error) {
	respondJSON(w, status, map[string]string{"error": err.Error()})
}

func respondDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		respondError(w, http.StatusNotFound, err)
	case errors.Is(err, domain.ErrInvalidEntity):
		respondError(w, http.StatusBadRequest, err)
	default:
		respondError(w, http.StatusInternalServerError, err)
	}
}

func readID(path string, prefix string) (int, error) {
	part := strings.TrimPrefix(path, prefix)
	part = strings.Trim(part, "/")
	return strconv.Atoi(part)
}

