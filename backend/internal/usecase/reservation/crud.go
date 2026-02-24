package reservation

import "backend/internal/domain"

type ReservationUpdate struct {
	PropertyID *int
	GuestID    *int
	StartDate  *string
	EndDate    *string
	TotalValue *float64
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
	if item.TotalValue != nil {
		existing.TotalValue = *item.TotalValue
	}
	if err := existing.Validate(); err != nil {
		return domain.Reservation{}, err
	}
	if item.PropertyID != nil {
		property, err := s.propertyRepo.GetByID(existing.PropertyID)
		if err != nil {
			return domain.Reservation{}, err
		}
		if !property.Active {
			return domain.Reservation{}, domain.ErrInvalidEntity
		}
	}
	return s.repo.Update(id, existing)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}
