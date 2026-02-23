package repository

import (
	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
)

type ReservationFileRepository struct {
	store *binaryEntityStore[domain.Reservation]
}

func NewReservationFileRepository(path string) (reservationuc.Repository, error) {
	store, err := newBinaryEntityStore[domain.Reservation](
		path,
		func(r domain.Reservation) int { return r.ID },
		func(r *domain.Reservation, id int) { r.ID = id },
	)
	if err != nil {
		return nil, err
	}
	return &ReservationFileRepository{store: store}, nil
}

func (r *ReservationFileRepository) Create(item domain.Reservation) (domain.Reservation, error) {
	return r.store.Create(item)
}

func (r *ReservationFileRepository) GetByID(id int) (domain.Reservation, error) {
	return r.store.GetByID(id)
}

func (r *ReservationFileRepository) GetAll() ([]domain.Reservation, error) {
	return r.store.GetAll()
}

func (r *ReservationFileRepository) GetByPropertyID(propertyID int) ([]domain.Reservation, error) {
	all, err := r.store.GetAll()
	if err != nil {
		return nil, err
	}
	items := make([]domain.Reservation, 0)
	for _, reservation := range all {
		if reservation.PropertyID == propertyID {
			items = append(items, reservation)
		}
	}
	return items, nil
}

func (r *ReservationFileRepository) Update(id int, item domain.Reservation) (domain.Reservation, error) {
	return r.store.Update(id, item)
}

func (r *ReservationFileRepository) Delete(id int) error {
	return r.store.Delete(id)
}
