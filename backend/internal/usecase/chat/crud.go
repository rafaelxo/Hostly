package chat

import (
	"backend/internal/domain"
	"sort"
	"time"
)

func (s *service) Send(item domain.ChatMessage) (domain.ChatMessage, error) {
	item.Normalize()
	if err := item.Validate(); err != nil {
		return domain.ChatMessage{}, err
	}

	fromUser, err := s.userRepo.GetByID(item.FromUserID)
	if err != nil {
		return domain.ChatMessage{}, err
	}
	toUser, err := s.userRepo.GetByID(item.ToUserID)
	if err != nil {
		return domain.ChatMessage{}, err
	}
	if !fromUser.Active || !toUser.Active {
		return domain.ChatMessage{}, domain.ErrInvalidEntity
	}

	isHostGuestPair :=
		(fromUser.Type == domain.UserTypeHost && toUser.Type == domain.UserTypeGuest) ||
			(fromUser.Type == domain.UserTypeGuest && toUser.Type == domain.UserTypeHost)
	if !isHostGuestPair {
		return domain.ChatMessage{}, domain.ErrInvalidEntity
	}

	hostID := fromUser.ID
	guestID := toUser.ID
	if fromUser.Type == domain.UserTypeGuest {
		hostID = toUser.ID
		guestID = fromUser.ID
	}

	allowed, err := s.canUsersChat(hostID, guestID, item.PropertyID)
	if err != nil {
		return domain.ChatMessage{}, err
	}
	if !allowed {
		return domain.ChatMessage{}, domain.ErrInvalidEntity
	}

	return s.repo.Create(item)
}

func (s *service) ListForUser(userID int, withUserID *int, propertyID *int) ([]domain.ChatMessage, error) {
	if userID <= 0 {
		return nil, domain.ErrInvalidEntity
	}
	if _, err := s.userRepo.GetByID(userID); err != nil {
		return nil, err
	}
	if withUserID != nil {
		if *withUserID <= 0 {
			return nil, domain.ErrInvalidEntity
		}
		if _, err := s.userRepo.GetByID(*withUserID); err != nil {
			return nil, err
		}

		otherUser, err := s.userRepo.GetByID(*withUserID)
		if err != nil {
			return nil, err
		}
		selfUser, err := s.userRepo.GetByID(userID)
		if err != nil {
			return nil, err
		}

		if selfUser.Type == domain.UserTypeAdmin || otherUser.Type == domain.UserTypeAdmin {
			return nil, domain.ErrInvalidEntity
		}

		hostID := userID
		guestID := *withUserID
		if selfUser.Type == domain.UserTypeGuest {
			hostID = *withUserID
			guestID = userID
		}

		propertyFilter := 0
		if propertyID != nil {
			propertyFilter = *propertyID
		}

		allowed, err := s.canUsersChat(hostID, guestID, propertyFilter)
		if err != nil {
			return nil, err
		}
		if !allowed {
			return nil, domain.ErrInvalidEntity
		}
	}

	all, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	filtered := make([]domain.ChatMessage, 0, len(all))
	for _, msg := range all {
		if withUserID == nil {
			if msg.FromUserID == userID || msg.ToUserID == userID {
				filtered = append(filtered, msg)
			}
			continue
		}

		isPair := (msg.FromUserID == userID && msg.ToUserID == *withUserID) ||
			(msg.FromUserID == *withUserID && msg.ToUserID == userID)
		matchesProperty := propertyID == nil || *propertyID <= 0 || msg.PropertyID == *propertyID || msg.PropertyID == 0
		if isPair && matchesProperty {
			filtered = append(filtered, msg)
		}
	}

	sort.Slice(filtered, func(i, j int) bool {
		left, lerr := time.Parse(time.RFC3339, filtered[i].CreatedAt)
		right, rerr := time.Parse(time.RFC3339, filtered[j].CreatedAt)
		if lerr != nil || rerr != nil {
			if filtered[i].CreatedAt == filtered[j].CreatedAt {
				return filtered[i].ID < filtered[j].ID
			}
			return filtered[i].CreatedAt < filtered[j].CreatedAt
		}
		if left.Equal(right) {
			return filtered[i].ID < filtered[j].ID
		}
		return left.Before(right)
	})

	return filtered, nil
}

func (s *service) ListAllowedContacts(userID int) ([]domain.User, error) {
	self, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	allowedIDs := map[int]struct{}{}

	reservations, err := s.reservationRepo.GetAll()
	if err != nil {
		return nil, err
	}
	properties, err := s.propertyRepo.GetAll()
	if err != nil {
		return nil, err
	}
	propertyOwnerByID := make(map[int]int, len(properties))
	for _, p := range properties {
		propertyOwnerByID[p.ID] = p.UserID
	}

	for _, r := range reservations {
		hostID, ok := propertyOwnerByID[r.PropertyID]
		if !ok {
			continue
		}

		if self.Type == domain.UserTypeGuest && r.GuestID == self.ID {
			allowedIDs[hostID] = struct{}{}
		}
		if self.Type == domain.UserTypeHost && hostID == self.ID {
			allowedIDs[r.GuestID] = struct{}{}
		}
	}

	messages, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}
	for _, msg := range messages {
		if msg.FromUserID == self.ID {
			allowedIDs[msg.ToUserID] = struct{}{}
		}
		if msg.ToUserID == self.ID {
			allowedIDs[msg.FromUserID] = struct{}{}
		}
	}

	allUsers, err := s.userRepo.GetAll()
	if err != nil {
		return nil, err
	}

	contacts := make([]domain.User, 0)
	for _, user := range allUsers {
		if user.ID == self.ID || !user.Active || user.Type == domain.UserTypeAdmin {
			continue
		}
		_, allowed := allowedIDs[user.ID]
		if !allowed {
			continue
		}

		if self.Type == domain.UserTypeGuest && user.Type == domain.UserTypeHost {
			contacts = append(contacts, user)
		}
		if self.Type == domain.UserTypeHost && user.Type == domain.UserTypeGuest {
			contacts = append(contacts, user)
		}
	}

	sort.Slice(contacts, func(i, j int) bool {
		return contacts[i].Name < contacts[j].Name
	})

	return contacts, nil
}

func (s *service) canUsersChat(hostID int, guestID int, propertyID int) (bool, error) {
	if hostID <= 0 || guestID <= 0 {
		return false, domain.ErrInvalidEntity
	}

	reservations, err := s.reservationRepo.GetAll()
	if err != nil {
		return false, err
	}
	properties, err := s.propertyRepo.GetAll()
	if err != nil {
		return false, err
	}

	propertyOwnerByID := make(map[int]int, len(properties))
	for _, p := range properties {
		propertyOwnerByID[p.ID] = p.UserID
	}

	for _, r := range reservations {
		ownerID, ok := propertyOwnerByID[r.PropertyID]
		if !ok {
			continue
		}
		if ownerID == hostID && r.GuestID == guestID {
			return true, nil
		}
	}

	if propertyID > 0 {
		property, err := s.propertyRepo.GetByID(propertyID)
		if err != nil {
			return false, err
		}
		if property.UserID == hostID {
			return true, nil
		}
	}

	return false, nil
}
