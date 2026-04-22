package repository

import (
	"backend/internal/domain"
)

type ReservationFileRepository struct {
	store     *binaryEntityStore[domain.Reservation]
	byProperty *extensibleRelationHash
}

func NewReservationFileRepository(path string) (*ReservationFileRepository, error) {
	store, err := newBinaryEntityStore(
		path,
		func(r domain.Reservation) int { return r.ID },
		func(r *domain.Reservation, id int) { r.ID = id },
		reservationPayloadCodec(),
	)
	if err != nil {
		return nil, err
	}

	byProperty, err := newExtensibleRelationHash(
		path+".relhash.dir",
		path+".relhash.buckets",
	)
	if err != nil {
		return nil, err
	}

	repo := &ReservationFileRepository{store: store, byProperty: byProperty}

	if byProperty.IsEmpty() {
		all, err := store.GetAll()
		if err != nil {
			return nil, err
		}
		for _, r := range all {
			if err := byProperty.Add(r.PropertyID, r.ID); err != nil {
				return nil, err
			}
		}
	}

	return repo, nil
}

func (r *ReservationFileRepository) HashStats() HashIndexStats {
	return r.store.HashStats()
}

func (r *ReservationFileRepository) Create(item domain.Reservation) (domain.Reservation, error) {
	created, err := r.store.Create(item)
	if err != nil {
		return created, err
	}
	if err := r.byProperty.Add(created.PropertyID, created.ID); err != nil {
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
	ids := r.byProperty.Get(propertyID)
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
		if err := r.byProperty.Remove(old.PropertyID, id); err != nil {
			return updated, err
		}
		if err := r.byProperty.Add(updated.PropertyID, id); err != nil {
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
	return r.byProperty.Remove(existing.PropertyID, id)
}
