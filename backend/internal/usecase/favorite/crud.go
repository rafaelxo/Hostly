package favorite

import (
	"backend/internal/domain"
	"time"
)

func (s *service) Create(item domain.Favorite) (domain.Favorite, error) {
	item.Normalize()
	if item.CreatedAt == "" {
		item.CreatedAt = time.Now().Format("2006-01-02")
	}
	item.Active = true
	if err := item.Validate(); err != nil {
		return domain.Favorite{}, err
	}

	user, err := s.userRepo.GetByID(item.UserID)
	if err != nil {
		return domain.Favorite{}, err
	}
	if !user.Active {
		return domain.Favorite{}, domain.ErrInvalidEntity
	}

	property, err := s.propertyRepo.GetByID(item.PropertyID)
	if err != nil {
		return domain.Favorite{}, err
	}
	if !property.Active {
		return domain.Favorite{}, domain.ErrInvalidEntity
	}

	return s.repo.Create(item)
}

func (s *service) Get(userID, propertyID int) (domain.Favorite, error) {
	if userID <= 0 || propertyID <= 0 {
		return domain.Favorite{}, domain.ErrInvalidEntity
	}
	return s.repo.Get(userID, propertyID)
}

func (s *service) GetPropertiesByUserID(userID int) ([]domain.Property, error) {
	if userID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	if _, err := s.userRepo.GetByID(userID); err != nil {
		return nil, err
	}
	favorites, err := s.repo.GetByUserIDOrderedByPropertyID(userID)
	if err != nil {
		return nil, err
	}
	properties := make([]domain.Property, 0, len(favorites))
	for _, favorite := range favorites {
		property, err := s.propertyRepo.GetByID(favorite.PropertyID)
		if err != nil {
			continue
		}
		if property.Active {
			properties = append(properties, property)
		}
	}
	return properties, nil
}

func (s *service) GetUsersByPropertyID(propertyID int) ([]domain.User, error) {
	if propertyID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	if _, err := s.propertyRepo.GetByID(propertyID); err != nil {
		return nil, err
	}
	favorites, err := s.repo.GetByPropertyID(propertyID)
	if err != nil {
		return nil, err
	}
	users := make([]domain.User, 0, len(favorites))
	for _, favorite := range favorites {
		user, err := s.userRepo.GetByID(favorite.UserID)
		if err != nil {
			continue
		}
		if user.Active {
			users = append(users, user)
		}
	}
	return users, nil
}

func (s *service) Delete(userID, propertyID int) error {
	if userID <= 0 || propertyID <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(userID, propertyID)
}
