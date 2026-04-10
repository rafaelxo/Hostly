package handler

import (
	"backend/internal/domain"
	aeduc "backend/internal/usecase/aed"
	"backend/internal/usecase/property"
	"encoding/json"
	"net/http"
	"strconv"
)

type createPropertyRequest struct {
	UserID      int    `json:"idUsuario"`
	Title       string `json:"titulo"`
	Description string `json:"descricao"`
	Address     struct {
		Street       string `json:"rua"`
		Number       string `json:"numero"`
		Neighborhood string `json:"bairro"`
		City         string `json:"cidade"`
		State        string `json:"estado"`
		ZipCode      string `json:"cep"`
	} `json:"endereco"`
	Amenities []struct {
		Name        string `json:"nome"`
		Description string `json:"descricao"`
	} `json:"comodidades"`
	City      string   `json:"cidade"`
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	DailyRate float64  `json:"valorDiaria"`
	CreatedAt string   `json:"dataCadastro"`
	Photos    []string `json:"fotos"`
	Active    bool     `json:"ativo"`
}

type propertyUpdatePayload struct {
	UserID      *int    `json:"idUsuario"`
	Title       *string `json:"titulo"`
	Description *string `json:"descricao"`
	Address     *struct {
		Street       string `json:"rua"`
		Number       string `json:"numero"`
		Neighborhood string `json:"bairro"`
		City         string `json:"cidade"`
		State        string `json:"estado"`
		ZipCode      string `json:"cep"`
	} `json:"endereco"`
	Amenities *[]struct {
		Name        string `json:"nome"`
		Description string `json:"descricao"`
	} `json:"comodidades"`
	City      *string   `json:"cidade"`
	Latitude  *float64  `json:"latitude"`
	Longitude *float64  `json:"longitude"`
	DailyRate *float64  `json:"valorDiaria"`
	CreatedAt *string   `json:"dataCadastro"`
	Photos    *[]string `json:"fotos"`
	Active    *bool     `json:"ativo"`
}

type PropertyHandler struct {
	svc    property.Service
	aedSvc aeduc.Service
}

func NewPropertyHandler(svc property.Service, aedSvc aeduc.Service) *PropertyHandler {
	return &PropertyHandler{svc: svc, aedSvc: aedSvc}
}

func (h *PropertyHandler) List(w http.ResponseWriter, r *http.Request) {
	if h.aedSvc != nil {
		query := r.URL.Query()

		if rawDailyRate := query.Get("valorDiaria"); rawDailyRate != "" {
			dailyRate, err := strconv.ParseFloat(rawDailyRate, 64)
			if err != nil {
				respondError(w, http.StatusBadRequest, err)
				return
			}

			searchResult, err := h.aedSvc.SearchPropertiesByDailyRateBPlus(dailyRate)
			if err != nil {
				respondDomainError(w, err)
				return
			}
			respondJSON(w, http.StatusOK, searchResult.Imoveis)
			return
		}

		if sortBy := query.Get("ordenarPor"); sortBy != "" {
			asc := query.Get("ordem") != "desc"
			result, err := h.aedSvc.ExternalSortProperties(sortBy, asc)
			if err != nil {
				respondDomainError(w, err)
				return
			}
			respondJSON(w, http.StatusOK, result.Itens)
			return
		}
	}

	items, err := h.svc.GetAll()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *PropertyHandler) ListByOwner(w http.ResponseWriter, r *http.Request) {
	ownerID, err := strconv.Atoi(r.PathValue("idUsuario"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	items, err := h.svc.GetByOwnerID(ownerID)
	if err != nil {
		respondDomainError(w, err)
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
		Address:     toDomainAddress(req.Address),
		Amenities:   toDomainAmenities(req.Amenities),
		City:        req.City,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
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
	updated, err := h.svc.Patch(id, property.PropertyPatch{
		UserID:      payload.UserID,
		Title:       payload.Title,
		Description: payload.Description,
		Address:     toDomainAddressPtr(payload.Address),
		Amenities:   toDomainAmenitiesPtr(payload.Amenities),
		City:        payload.City,
		Latitude:    payload.Latitude,
		Longitude:   payload.Longitude,
		DailyRate:   payload.DailyRate,
		CreatedAt:   payload.CreatedAt,
		Photos:      payload.Photos,
		Active:      payload.Active,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func toDomainAddress(value struct {
	Street       string `json:"rua"`
	Number       string `json:"numero"`
	Neighborhood string `json:"bairro"`
	City         string `json:"cidade"`
	State        string `json:"estado"`
	ZipCode      string `json:"cep"`
}) domain.Address {
	return domain.Address{
		Street:       value.Street,
		Number:       value.Number,
		Neighborhood: value.Neighborhood,
		City:         value.City,
		State:        value.State,
		ZipCode:      value.ZipCode,
	}
}

func toDomainAddressPtr(value *struct {
	Street       string `json:"rua"`
	Number       string `json:"numero"`
	Neighborhood string `json:"bairro"`
	City         string `json:"cidade"`
	State        string `json:"estado"`
	ZipCode      string `json:"cep"`
}) *domain.Address {
	if value == nil {
		return nil
	}
	parsed := toDomainAddress(*value)
	return &parsed
}

func toDomainAmenities(values []struct {
	Name        string `json:"nome"`
	Description string `json:"descricao"`
}) []domain.Amenity {
	if len(values) == 0 {
		return []domain.Amenity{}
	}
	items := make([]domain.Amenity, 0, len(values))
	for _, item := range values {
		items = append(items, domain.Amenity{Name: item.Name, Description: item.Description})
	}
	return items
}

func toDomainAmenitiesPtr(values *[]struct {
	Name        string `json:"nome"`
	Description string `json:"descricao"`
}) *[]domain.Amenity {
	if values == nil {
		return nil
	}
	parsed := toDomainAmenities(*values)
	return &parsed
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
