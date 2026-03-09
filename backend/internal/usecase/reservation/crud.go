package reservation

import (
	"backend/internal/domain"
	"math"
	"time"
)

type ReservationUpdate struct {
	PropertyID *int
	GuestID    *int
	StartDate  *string
	EndDate    *string
}

func (s *service) Create(item domain.Reservation) (domain.Reservation, error) {
	if err := item.Validate(); err != nil {
		return domain.Reservation{}, err
	}

	property, err := s.propertyRepo.GetByID(item.PropertyID)
	if err != nil {
		return domain.Reservation{}, err
	}
	if !property.Active {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}

	guest, err := s.guestRepo.GetByID(item.GuestID)
	if err != nil {
		return domain.Reservation{}, err
	}
	if !guest.Active {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}

	totalValue, err := calculateTotalValue(property.DailyRate, item.StartDate, item.EndDate)
	if err != nil {
		return domain.Reservation{}, err
	}

	item.TotalValue = totalValue

	return s.repo.Create(item)
}

func (s *service) GetByID(id int) (domain.Reservation, error) {
	if id <= 0 {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}
	return s.repo.GetByID(id)
}

func (s *service) GetAll() ([]domain.Reservation, error) {
	return s.repo.GetAll()
}

func (s *service) GetByPropertyID(propertyID int) ([]domain.Reservation, error) {
	if propertyID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	if _, err := s.propertyRepo.GetByID(propertyID); err != nil {
		return nil, err
	}
	return s.repo.GetByPropertyID(propertyID)
}

func (s *service) GetByGuestID(guestID int) ([]domain.Reservation, error) {
	if guestID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	if _, err := s.guestRepo.GetByID(guestID); err != nil {
		return nil, err
	}
	all, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}
	filtered := make([]domain.Reservation, 0)
	for _, item := range all {
		if item.GuestID == guestID {
			filtered = append(filtered, item)
		}
	}
	return filtered, nil
}

func (s *service) GetByHostID(hostID int) ([]domain.Reservation, error) {
	if hostID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	host, err := s.guestRepo.GetByID(hostID)
	if err != nil {
		return nil, err
	}
	if host.Type != domain.UserTypeHost && host.Type != domain.UserTypeAdmin {
		return nil, domain.ErrInvalidEntity
	}

	properties, err := s.propertyRepo.GetAll()
	if err != nil {
		return nil, err
	}
	owned := make(map[int]struct{})
	for _, p := range properties {
		if p.UserID == hostID {
			owned[p.ID] = struct{}{}
		}
	}

	all, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}
	filtered := make([]domain.Reservation, 0)
	for _, item := range all {
		if _, ok := owned[item.PropertyID]; ok {
			filtered = append(filtered, item)
		}
	}
	return filtered, nil
}

func (s *service) Update(id int, item ReservationUpdate) (domain.Reservation, error) {
	if id <= 0 {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return domain.Reservation{}, err
	}
	if item.PropertyID != nil {
		existing.PropertyID = *item.PropertyID
	}
	if item.GuestID != nil {
		existing.GuestID = *item.GuestID
	}
	if item.StartDate != nil {
		existing.StartDate = *item.StartDate
	}
	if item.EndDate != nil {
		existing.EndDate = *item.EndDate
	}
	if err := existing.Validate(); err != nil {
		return domain.Reservation{}, err
	}

	property, err := s.propertyRepo.GetByID(existing.PropertyID)
	if err != nil {
		return domain.Reservation{}, err
	}
	if !property.Active {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}

	guest, err := s.guestRepo.GetByID(existing.GuestID)
	if err != nil {
		return domain.Reservation{}, err
	}
	if !guest.Active {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}

	totalValue, err := calculateTotalValue(property.DailyRate, existing.StartDate, existing.EndDate)
	if err != nil {
		return domain.Reservation{}, err
	}

	existing.TotalValue = totalValue

	return s.repo.Update(id, existing)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}

func calculateTotalValue(dailyRate float64, startDate string, endDate string) (float64, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return 0, domain.ErrInvalidEntity
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return 0, domain.ErrInvalidEntity
	}

	nights := math.Ceil(end.Sub(start).Hours() / 24)
	if nights < 0 {
		return 0, domain.ErrInvalidEntity
	}

	return nights * dailyRate, nil
}
