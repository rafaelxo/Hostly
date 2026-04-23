package repository

import (
	"backend/internal/domain"
	reservationuc "backend/internal/usecase/reservation"
)

type ReservationFileRepository struct {
	store        *binaryEntityStore[domain.Reservation]
	byPropertyID *multiExtensibleHashIndex
	byGuestID    *multiExtensibleHashIndex
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

	byPropertyID, err := newMultiExtensibleHashIndex(path+".byproperty.ridx", 8)
	if err != nil {
		return nil, err
	}
	byGuestID, err := newMultiExtensibleHashIndex(path+".byguest.ridx", 8)
	if err != nil {
		return nil, err
	}

	repo := &ReservationFileRepository{store: store, byPropertyID: byPropertyID, byGuestID: byGuestID}
	if err := repo.rebuildRelationIndexes(); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *ReservationFileRepository) HashStats() HashIndexStats {
	return r.store.HashStats()
}

func (r *ReservationFileRepository) Create(item domain.Reservation) (domain.Reservation, error) {
	created, err := r.store.Create(item)
	if err != nil {
		return domain.Reservation{}, err
	}
	r.byPropertyID.Insert(created.PropertyID, int64(created.ID))
	r.byGuestID.Insert(created.GuestID, int64(created.ID))
	if err := r.flushRelationIndexes(); err != nil {
		r.byPropertyID.Delete(created.PropertyID, int64(created.ID))
		r.byGuestID.Delete(created.GuestID, int64(created.ID))
		_ = r.store.Delete(created.ID)
		return domain.Reservation{}, err
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
	ids, ok := r.byPropertyID.Get(propertyID)
	if !ok {
		return []domain.Reservation{}, nil
	}
	items := make([]domain.Reservation, 0, len(ids))
	for _, id := range ids {
		item, err := r.store.GetByID(int(id))
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *ReservationFileRepository) GetByGuestID(guestID int) ([]domain.Reservation, error) {
	ids, ok := r.byGuestID.Get(guestID)
	if !ok {
		return []domain.Reservation{}, nil
	}
	items := make([]domain.Reservation, 0, len(ids))
	for _, id := range ids {
		item, err := r.store.GetByID(int(id))
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *ReservationFileRepository) Update(id int, item domain.Reservation) (domain.Reservation, error) {
	existing, err := r.store.GetByID(id)
	if err != nil {
		return domain.Reservation{}, err
	}
	updated, err := r.store.Update(id, item)
	if err != nil {
		return domain.Reservation{}, err
	}
	if existing.PropertyID != updated.PropertyID {
		r.byPropertyID.Delete(existing.PropertyID, int64(existing.ID))
		r.byPropertyID.Insert(updated.PropertyID, int64(updated.ID))
	}
	if existing.GuestID != updated.GuestID {
		r.byGuestID.Delete(existing.GuestID, int64(existing.ID))
		r.byGuestID.Insert(updated.GuestID, int64(updated.ID))
	}
	if err := r.flushRelationIndexes(); err != nil {
		return domain.Reservation{}, err
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
	r.byPropertyID.Delete(existing.PropertyID, int64(existing.ID))
	r.byGuestID.Delete(existing.GuestID, int64(existing.ID))
	return r.flushRelationIndexes()
}

func (r *ReservationFileRepository) rebuildRelationIndexes() error {
	r.byPropertyID.Reset()
	r.byGuestID.Reset()
	items, err := r.store.GetAll()
	if err != nil {
		return err
	}
	for _, item := range items {
		r.byPropertyID.Insert(item.PropertyID, int64(item.ID))
		r.byGuestID.Insert(item.GuestID, int64(item.ID))
	}
	return r.flushRelationIndexes()
}

func (r *ReservationFileRepository) flushRelationIndexes() error {
	if err := r.byPropertyID.persistToFile(); err != nil {
		return err
	}
	return r.byGuestID.persistToFile()
}

var _ reservationuc.Repository = (*ReservationFileRepository)(nil)
