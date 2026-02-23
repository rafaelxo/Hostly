package property

import (
	"time"

	"backend/internal/domain"
)

func (s *service) Create(item domain.Property) (domain.Property, error) {
	if item.CreatedAt == "" {
		item.CreatedAt = time.Now().Format("2006-01-02")
	}
	if err := item.Validate(); err != nil {
		return domain.Property{}, err
	}
	return s.repo.Create(item)
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

func (s *service) Update(id int, item domain.Property) (domain.Property, error) {
	item.ID = id
	if err := item.Validate(); err != nil {
		return domain.Property{}, err
	}
	return s.repo.Update(id, item)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}
