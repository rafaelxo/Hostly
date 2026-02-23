package reservation

import "backend/internal/domain"

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

func (s *service) Update(id int, item domain.Reservation) (domain.Reservation, error) {
	if id <= 0 {
		return domain.Reservation{}, domain.ErrInvalidEntity
	}

	item.ID = id
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

	return s.repo.Update(id, item)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}
