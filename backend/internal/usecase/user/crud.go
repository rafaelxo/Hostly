package user

import "backend/internal/domain"

func (s *service) Create(item domain.User) (domain.User, error) {
	if item.Type == "" {
		item.Type = domain.UserTypeHost
	}
	if err := item.Validate(); err != nil {
		return domain.User{}, err
	}
	return s.repo.Create(item)
}

func (s *service) GetByID(id int) (domain.User, error) {
	if id <= 0 {
		return domain.User{}, domain.ErrInvalidEntity
	}
	return s.repo.GetByID(id)
}

func (s *service) GetAllHosts() ([]domain.User, error) {
	users, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	hosts := make([]domain.User, 0, len(users))
	for _, u := range users {
		if u.Type == domain.UserTypeHost && u.Active {
			hosts = append(hosts, u)
		}
	}
	return hosts, nil
}

func (s *service) Update(id int, item domain.User) (domain.User, error) {
	item.ID = id
	if item.Type == "" {
		item.Type = domain.UserTypeHost
	}
	if err := item.Validate(); err != nil {
		return domain.User{}, err
	}
	return s.repo.Update(id, item)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}
