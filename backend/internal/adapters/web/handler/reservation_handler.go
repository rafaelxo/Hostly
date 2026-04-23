package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"
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
	query := r.URL.Query()

	var (
		items []domain.Reservation
		err   error
	)

	if rawPropertyID := query.Get("idImovel"); rawPropertyID != "" {
		propertyID, parseErr := strconv.Atoi(rawPropertyID)
		if parseErr != nil {
			respondError(w, http.StatusBadRequest, parseErr)
			return
		}
		items, err = h.svc.GetByPropertyID(propertyID)
	} else if rawUserID := query.Get("idUsuario"); rawUserID != "" {
		userID, parseErr := strconv.Atoi(rawUserID)
		if parseErr != nil {
			respondError(w, http.StatusBadRequest, parseErr)
			return
		}

		scope := query.Get("papel")
		switch scope {
		case "hospede":
			items, err = h.svc.GetByGuestID(userID)
		case "anfitriao":
			items, err = h.svc.GetByHostID(userID)
		case "":
			guestItems, guestErr := h.svc.GetByGuestID(userID)
			if guestErr != nil {
				respondDomainError(w, guestErr)
				return
			}
			hostItems, hostErr := h.svc.GetByHostID(userID)
			if hostErr != nil && !errors.Is(hostErr, domain.ErrInvalidEntity) {
				respondDomainError(w, hostErr)
				return
			}
			merged := make(map[int]domain.Reservation)
			for _, item := range guestItems {
				merged[item.ID] = item
			}
			for _, item := range hostItems {
				merged[item.ID] = item
			}
			items = make([]domain.Reservation, 0, len(merged))
			for _, item := range merged {
				items = append(items, item)
			}
		default:
			respondError(w, http.StatusBadRequest, fmt.Errorf("campo papel obrigatorio para filtro por usuario"))
			return
		}
	} else {
		items, err = h.svc.GetAll()
	}
	if err != nil {
		respondDomainError(w, err)
		return
	}

	filtered, err := filterReservations(
		items,
		query.Get("status"),
		firstNonEmpty(query.Get("periodoDe"), query.Get("dataInicioDe")),
		firstNonEmpty(query.Get("periodoAte"), query.Get("dataFimAte")),
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	if sortBy := query.Get("ordenarPor"); sortBy != "" {
		asc := query.Get("ordem") != "desc"
		sort.Slice(filtered, func(i, j int) bool {
			left := filtered[i]
			right := filtered[j]

			var less bool
			switch sortBy {
			case "valorTotal":
				if left.TotalValue == right.TotalValue {
					less = left.ID < right.ID
				} else {
					less = left.TotalValue < right.TotalValue
				}
			case "dataFim":
				less = compareDateThenID(left.EndDate, right.EndDate, left.ID, right.ID)
			default:
				less = compareDateThenID(left.StartDate, right.StartDate, left.ID, right.ID)
			}

			if asc {
				return less
			}
			return !less
		})
	}

	respondJSON(w, http.StatusOK, filtered)
}

func compareDateThenID(leftDate string, rightDate string, leftID int, rightID int) bool {
	leftParsed, leftErr := time.Parse("2006-01-02", leftDate)
	rightParsed, rightErr := time.Parse("2006-01-02", rightDate)

	if leftErr != nil || rightErr != nil {
		if leftDate == rightDate {
			return leftID < rightID
		}
		return leftDate < rightDate
	}

	if leftParsed.Equal(rightParsed) {
		return leftID < rightID
	}

	return leftParsed.Before(rightParsed)
}

func filterReservations(items []domain.Reservation, statusRaw, periodFromRaw, periodToRaw string) ([]domain.Reservation, error) {
	var periodFrom *time.Time
	if periodFromRaw != "" {
		parsed, err := time.Parse("2006-01-02", periodFromRaw)
		if err != nil {
			return nil, err
		}
		periodFrom = &parsed
	}

	var periodTo *time.Time
	if periodToRaw != "" {
		parsed, err := time.Parse("2006-01-02", periodToRaw)
		if err != nil {
			return nil, err
		}
		periodTo = &parsed
	}

	filtered := make([]domain.Reservation, 0, len(items))
	for _, item := range items {
		if statusRaw != "" && string(item.Status) != statusRaw {
			continue
		}

		if periodFrom != nil || periodTo != nil {
			startDate, startErr := time.Parse("2006-01-02", item.StartDate)
			endDate, endErr := time.Parse("2006-01-02", item.EndDate)
			if startErr != nil || endErr != nil {
				continue
			}
			if periodFrom != nil && endDate.Before(*periodFrom) {
				continue
			}
			if periodTo != nil && startDate.After(*periodTo) {
				continue
			}
		}

		filtered = append(filtered, item)
	}

	return filtered, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
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
