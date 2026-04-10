package property

import (
	"backend/internal/domain"
	"time"
)

type PropertyPatch struct {
	UserID      *int
	Title       *string
	Description *string
	Address     *domain.Address
	Amenities   *[]domain.Amenity
	City        *string
	Latitude    *float64
	Longitude   *float64
	DailyRate   *float64
	CreatedAt   *string
	Photos      *[]string
	Active      *bool
}

func (s *service) Create(item domain.Property) (domain.Property, error) {
	item.Normalize()
	if item.CreatedAt == "" {
		item.CreatedAt = time.Now().Format("2006-01-02")
	}
	owner, err := s.userRepo.GetByID(item.UserID)
	if err != nil {
		return domain.Property{}, err
	}
	if !owner.Active {
		return domain.Property{}, domain.ErrInvalidEntity
	}
	if err := item.Validate(); err != nil {
		return domain.Property{}, err
	}

	created, err := s.repo.Create(item)
	if err != nil {
		return domain.Property{}, err
	}

	if owner.Type == domain.UserTypeGuest {
		owner.Type = domain.UserTypeHost
		if _, err := s.userRepo.Update(owner.ID, owner); err != nil {
			_ = s.repo.Delete(created.ID)
			return domain.Property{}, err
		}
	}

	return created, nil
}

func (s *service) GetByID(id int) (domain.Property, error) {
	if id <= 0 {
		return domain.Property{}, domain.ErrInvalidEntity
	}
	return s.repo.GetByID(id)
}

func (s *service) GetAll() ([]domain.Property, error) {
	all, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	active := make([]domain.Property, 0, len(all))
	for _, item := range all {
		if item.Active {
			active = append(active, item)
		}
	}

	return active, nil
}

func (s *service) GetByOwnerID(ownerID int) ([]domain.Property, error) {
	if ownerID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	all, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}
	owned := make([]domain.Property, 0)
	for _, item := range all {
		if item.UserID == ownerID {
			owned = append(owned, item)
		}
	}
	return owned, nil
}

func (s *service) Update(id int, item domain.Property) (domain.Property, error) {
	if id <= 0 {
		return domain.Property{}, domain.ErrInvalidEntity
	}
	item.Normalize()
	item.ID = id
	owner, err := s.userRepo.GetByID(item.UserID)
	if err != nil {
		return domain.Property{}, err
	}
	if !owner.Active {
		return domain.Property{}, domain.ErrInvalidEntity
	}
	if err := item.Validate(); err != nil {
		return domain.Property{}, err
	}
	return s.repo.Update(id, item)
}

func (s *service) Patch(id int, p PropertyPatch) (domain.Property, error) {
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return domain.Property{}, err
	}
	if p.UserID != nil {
		existing.UserID = *p.UserID
	}
	if p.Title != nil {
		existing.Title = *p.Title
	}
	if p.Description != nil {
		existing.Description = *p.Description
	}
	if p.Address != nil {
		existing.Address = *p.Address
	}
	if p.Amenities != nil {
		existing.Amenities = *p.Amenities
	}
	if p.City != nil {
		existing.City = *p.City
	}
	if p.Latitude != nil {
		existing.Latitude = *p.Latitude
	}
	if p.Longitude != nil {
		existing.Longitude = *p.Longitude
	}
	if p.DailyRate != nil {
		existing.DailyRate = *p.DailyRate
	}
	if p.CreatedAt != nil {
		existing.CreatedAt = *p.CreatedAt
	}
	if p.Photos != nil {
		existing.Photos = *p.Photos
	}
	if p.Active != nil {
		existing.Active = *p.Active
	}

	existing.Normalize()

	owner, err := s.userRepo.GetByID(existing.UserID)
	if err != nil {
		return domain.Property{}, err
	}
	if !owner.Active {
		return domain.Property{}, domain.ErrInvalidEntity
	}

	if err := existing.Validate(); err != nil {
		return domain.Property{}, err
	}
	return s.repo.Update(id, existing)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}
