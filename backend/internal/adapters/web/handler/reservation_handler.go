package handler

import (
	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"
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
	filter, err := parseReservationListFilter(
		query.Get("idImovel"),
		query.Get("idUsuario"),
		query.Get("papel"),
		query.Get("status"),
		firstNonEmpty(query.Get("periodoDe"), query.Get("dataInicioDe")),
		firstNonEmpty(query.Get("periodoAte"), query.Get("dataFimAte")),
		query.Get("busca"),
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	filtered, err := h.svc.List(filter)
	if err != nil {
		respondDomainError(w, err)
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

func parseReservationListFilter(rawPropertyID, rawUserID, role, status, periodFrom, periodTo, query string) (reservationuc.ListFilter, error) {
	filter := reservationuc.ListFilter{
		Role:       role,
		Status:     status,
		PeriodFrom: periodFrom,
		PeriodTo:   periodTo,
		Query:      query,
	}
	if rawPropertyID != "" {
		propertyID, err := strconv.Atoi(rawPropertyID)
		if err != nil {
			return reservationuc.ListFilter{}, err
		}
		filter.PropertyID = &propertyID
	}
	if rawUserID != "" {
		userID, err := strconv.Atoi(rawUserID)
		if err != nil {
			return reservationuc.ListFilter{}, err
		}
		filter.UserID = &userID
	}
	if filter.UserID != nil && filter.Role != "" && filter.Role != "hospede" && filter.Role != "anfitriao" {
		return reservationuc.ListFilter{}, fmt.Errorf("campo papel obrigatorio para filtro por usuario")
	}
	return filter, nil
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
