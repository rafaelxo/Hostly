package repository

import (
	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
	"sync"
)
type ReservationFileRepository struct {
	store   *binaryEntityStore[domain.Reservation]
	pending map[int]domain.Reservation
	mu      sync.Mutex
}

func NewReservationFileRepository(path string) (reservationuc.Repository, error) {
	store, err := newBinaryEntityStore(
		path,
		func(r domain.Reservation) int { return r.ID },
		func(r *domain.Reservation, id int) { r.ID = id },
		reservationPayloadCodec(),
	)
	if err != nil {
		return nil, err
	}
	return &ReservationFileRepository{
		store:   store,
		pending: make(map[int]domain.Reservation),
	}, nil
}

func (r *ReservationFileRepository) Create(item domain.Reservation) (domain.Reservation, error) {
	id, err := r.store.nextID()
	if err != nil {
		return domain.Reservation{}, err
	}
	item.ID = id

	r.mu.Lock()
	r.pending[id] = item
	r.mu.Unlock()

	return item, nil
}

func (r *ReservationFileRepository) GetByID(id int) (domain.Reservation, error) {
	r.mu.Lock()
	item, ok := r.pending[id]
	r.mu.Unlock()
	if ok {
		return item, nil
	}
	return r.store.GetByID(id)
}

func (r *ReservationFileRepository) GetAll() ([]domain.Reservation, error) {
	persisted, err := r.store.GetAll()
	if err != nil {
		return nil, err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	result := make([]domain.Reservation, 0, len(persisted)+len(r.pending))
	result = append(result, persisted...)
	for _, item := range r.pending {
		result = append(result, item)
	}
	return result, nil
}

func (r *ReservationFileRepository) GetByPropertyID(propertyID int) ([]domain.Reservation, error) {
	all, err := r.GetAll()
	if err != nil {
		return nil, err
	}
	items := make([]domain.Reservation, 0)
	for _, item := range all {
		if item.PropertyID == propertyID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *ReservationFileRepository) Update(id int, item domain.Reservation) (domain.Reservation, error) {
	r.mu.Lock()
	_, isPending := r.pending[id]
	r.mu.Unlock()

	if isPending {
		item.ID = id
		if item.Status == domain.ReservationStatusConfirmed {
			persisted, err := r.store.createWithID(item)
			if err != nil {
				return domain.Reservation{}, err
			}
			r.mu.Lock()
			delete(r.pending, id)
			r.mu.Unlock()
			return persisted, nil
		}
		r.mu.Lock()
		r.pending[id] = item
		r.mu.Unlock()
		return item, nil
	}

	return r.store.Update(id, item)
}

func (r *ReservationFileRepository) Delete(id int) error {
	r.mu.Lock()
	_, isPending := r.pending[id]
	if isPending {
		delete(r.pending, id)
		r.mu.Unlock()
		return nil
	}
	r.mu.Unlock()

	return r.store.Delete(id)
}
