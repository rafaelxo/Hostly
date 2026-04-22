package repository

import (
	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
)

type ReservationFileRepository struct {
	store *binaryEntityStore[domain.Reservation]
	ehash *extendibleHash
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

	ehash, err := newExtendibleHash(path+".hash.dir", path+".hash.buckets")
	if err != nil {
		return nil, err
	}

	repo := &ReservationFileRepository{store: store, ehash: ehash}

	if len(ehash.buckets) == 1 && len(ehash.buckets[0].entries) == 0 {
		all, err := store.GetAll()
		if err != nil {
			return nil, err
		}
		for _, r := range all {
			if err := ehash.Add(r.PropertyID, r.ID); err != nil {
				return nil, err
			}
		}
	}

	return repo, nil
}

func (r *ReservationFileRepository) Create(item domain.Reservation) (domain.Reservation, error) {
	created, err := r.store.Create(item)
	if err != nil {
		return created, err
	}
	if err := r.ehash.Add(created.PropertyID, created.ID); err != nil {
		return created, err
	}
	return created, nil
}

func (r *ReservationFileRepository) GetByID(id int) (domain.Reservation, error) {
	return r.store.GetByID(id)
}

func (r *ReservationFileRepository) GetAll() ([]domain.Reservation, error) {
	return r.store.GetAll()
}

func (r *ReservationFileRepository) GetByPropertyID(propertyID int) ([]domain.Reservation, error) {
	ids, err := r.ehash.Get(propertyID)
	if err != nil {
		return nil, err
	}
	items := make([]domain.Reservation, 0, len(ids))
	for _, id := range ids {
		reservation, err := r.store.GetByID(id)
		if err != nil {
			if err == domain.ErrNotFound {
				continue
			}
			return nil, err
		}
		items = append(items, reservation)
	}
	return items, nil
}

func (r *ReservationFileRepository) Update(id int, item domain.Reservation) (domain.Reservation, error) {
	old, err := r.store.GetByID(id)
	if err != nil {
		return domain.Reservation{}, err
	}

	updated, err := r.store.Update(id, item)
	if err != nil {
		return updated, err
	}

	if old.PropertyID != updated.PropertyID {
		if err := r.ehash.Remove(old.PropertyID, id); err != nil {
			return updated, err
		}
		if err := r.ehash.Add(updated.PropertyID, id); err != nil {
			return updated, err
		}
	}
	return updated, nil
}

func (r *ReservationFileRepository) Delete(id int) error {
	existing, err := r.store.GetByID(id)
	if err != nil {
		return err
	}
	if err := r.store.Delete(id); err != nil {
		return err
	}
	return r.ehash.Remove(existing.PropertyID, id)
}
