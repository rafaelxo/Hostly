package user

import "backend/internal/domain"

type UserPatch struct {
	Name     *string
	Email    *string
	Password *string
	Type     *domain.UserType
	Active   *bool
}

func (s *service) Create(item domain.User) (domain.User, error) {
	if item.Type == "" {
		item.Type = domain.UserTypeGuest
	}
	if item.Password == "" {
		return domain.User{}, domain.ErrInvalidEntity
	}
	if _, err := s.repo.GetByEmail(item.Email); err == nil {
		return domain.User{}, domain.ErrInvalidEntity
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

func (s *service) GetByEmail(email string) (domain.User, error) {
	if email == "" {
		return domain.User{}, domain.ErrInvalidEntity
	}
	return s.repo.GetByEmail(email)
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

func (s *service) GetAll() ([]domain.User, error) {
	users, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	activeUsers := make([]domain.User, 0, len(users))
	for _, u := range users {
		if u.Active {
			activeUsers = append(activeUsers, u)
		}
	}
	return activeUsers, nil
}

func (s *service) Update(id int, item domain.User) (domain.User, error) {
	if id <= 0 {
		return domain.User{}, domain.ErrInvalidEntity
	}
	item.ID = id
	if item.Type == "" {
		item.Type = domain.UserTypeHost
	}
	if err := item.Validate(); err != nil {
		return domain.User{}, err
	}
	return s.repo.Update(id, item)
}

func (s *service) Patch(id int, p UserPatch) (domain.User, error) {
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return domain.User{}, err
	}
	if p.Name != nil {
		existing.Name = *p.Name
	}
	if p.Email != nil {
		existing.Email = *p.Email
	}
	if p.Password != nil {
		existing.Password = *p.Password
	}
	if p.Type != nil {
		existing.Type = *p.Type
	}
	if p.Active != nil {
		existing.Active = *p.Active
	}
	return s.Update(id, existing)
}

func (s *service) Delete(id int) error {
	if id <= 0 {
		return domain.ErrInvalidEntity
	}
	return s.repo.Delete(id)
}

func (s *service) SeedAdmin(name string, email string, password string) (domain.User, error) {
	existing, err := s.repo.GetByEmail(email)
	if err == nil {
		return existing, nil
	}

	admin := domain.User{
		Name:     name,
		Email:    email,
		Password: password,
		Type:     domain.UserTypeAdmin,
		Active:   true,
	}

	if err := admin.Validate(); err != nil {
		return domain.User{}, err
	}

	return s.repo.Create(admin)
}
