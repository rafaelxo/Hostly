package repository

import (
	"os"
	"path/filepath"
	"sort"
	"testing"

	"backend/internal/domain"
)

func TestRelationHashAddGetRemove(t *testing.T) {
	dir := t.TempDir()
	h, err := newExtensibleRelationHash(
		filepath.Join(dir, "rel.dir"),
		filepath.Join(dir, "rel.buckets"),
	)
	if err != nil {
		t.Fatal(err)
	}

	if err := h.Add(1, 10); err != nil {
		t.Fatal(err)
	}
	if err := h.Add(1, 20); err != nil {
		t.Fatal(err)
	}
	if err := h.Add(2, 30); err != nil {
		t.Fatal(err)
	}

	got := h.Get(1)
	sort.Ints(got)
	if len(got) != 2 || got[0] != 10 || got[1] != 20 {
		t.Fatalf("Get(1) = %v, want [10 20]", got)
	}
	if got := h.Get(2); len(got) != 1 || got[0] != 30 {
		t.Fatalf("Get(2) = %v, want [30]", got)
	}
	if got := h.Get(99); len(got) != 0 {
		t.Fatalf("Get(99) = %v, want []", got)
	}

	if err := h.Remove(1, 10); err != nil {
		t.Fatal(err)
	}
	if got := h.Get(1); len(got) != 1 || got[0] != 20 {
		t.Fatalf("Get(1) after remove = %v, want [20]", got)
	}
}

func TestRelationHashManyValuesPerKey(t *testing.T) {
	// One property with 20 reservations forces the overflow path: all
	// entries collide on the same key and no split can separate them.
	dir := t.TempDir()
	h, err := newExtensibleRelationHash(
		filepath.Join(dir, "rel.dir"),
		filepath.Join(dir, "rel.buckets"),
	)
	if err != nil {
		t.Fatal(err)
	}

	for i := 1; i <= 20; i++ {
		if err := h.Add(42, i); err != nil {
			t.Fatalf("Add %d: %v", i, err)
		}
	}

	got := h.Get(42)
	sort.Ints(got)
	for i := 1; i <= 20; i++ {
		if got[i-1] != i {
			t.Fatalf("Get(42)[%d] = %d, want %d", i-1, got[i-1], i)
		}
	}

	// Remove half.
	for i := 1; i <= 10; i++ {
		if err := h.Remove(42, i); err != nil {
			t.Fatal(err)
		}
	}
	if got := h.Get(42); len(got) != 10 {
		t.Fatalf("Get(42) after removing 10 = %d entries, want 10", len(got))
	}
}

func TestRelationHashSpreadsAcrossBuckets(t *testing.T) {
	dir := t.TempDir()
	h, err := newExtensibleRelationHash(
		filepath.Join(dir, "rel.dir"),
		filepath.Join(dir, "rel.buckets"),
	)
	if err != nil {
		t.Fatal(err)
	}

	for k := 1; k <= 32; k++ {
		if err := h.Add(k, k*100); err != nil {
			t.Fatal(err)
		}
	}

	for k := 1; k <= 32; k++ {
		got := h.Get(k)
		if len(got) != 1 || got[0] != k*100 {
			t.Fatalf("Get(%d) = %v, want [%d]", k, got, k*100)
		}
	}
}

func TestRelationHashPersistsAcrossReopen(t *testing.T) {
	dir := t.TempDir()
	dp := filepath.Join(dir, "rel.dir")
	bp := filepath.Join(dir, "rel.buckets")

	h1, err := newExtensibleRelationHash(dp, bp)
	if err != nil {
		t.Fatal(err)
	}
	for k := 1; k <= 10; k++ {
		for v := 1; v <= 5; v++ {
			if err := h1.Add(k, k*10+v); err != nil {
				t.Fatal(err)
			}
		}
	}

	h2, err := newExtensibleRelationHash(dp, bp)
	if err != nil {
		t.Fatal(err)
	}
	for k := 1; k <= 10; k++ {
		got := h2.Get(k)
		if len(got) != 5 {
			t.Fatalf("after reopen Get(%d) = %d entries, want 5", k, len(got))
		}
	}
}

func TestReservationRepoGetByPropertyIDUsesHash(t *testing.T) {
	dir := t.TempDir()
	repo, err := NewReservationFileRepository(filepath.Join(dir, "reservas.db"))
	if err != nil {
		t.Fatal(err)
	}

	r1, _ := repo.Create(domain.Reservation{PropertyID: 1, GuestID: 10})
	r2, _ := repo.Create(domain.Reservation{PropertyID: 1, GuestID: 11})
	r3, _ := repo.Create(domain.Reservation{PropertyID: 2, GuestID: 12})

	listP1, err := repo.GetByPropertyID(1)
	if err != nil {
		t.Fatal(err)
	}
	if len(listP1) != 2 {
		t.Fatalf("GetByPropertyID(1) = %d items, want 2", len(listP1))
	}
	listP2, _ := repo.GetByPropertyID(2)
	if len(listP2) != 1 || listP2[0].ID != r3.ID {
		t.Fatalf("GetByPropertyID(2) = %+v, want [%d]", listP2, r3.ID)
	}

	// Update r1 to move from property 1 to property 3.
	if _, err := repo.Update(r1.ID, domain.Reservation{PropertyID: 3, GuestID: 10}); err != nil {
		t.Fatal(err)
	}
	listP1b, _ := repo.GetByPropertyID(1)
	if len(listP1b) != 1 || listP1b[0].ID != r2.ID {
		t.Fatalf("GetByPropertyID(1) after update = %+v, want [%d]", listP1b, r2.ID)
	}
	listP3, _ := repo.GetByPropertyID(3)
	if len(listP3) != 1 || listP3[0].ID != r1.ID {
		t.Fatalf("GetByPropertyID(3) = %+v, want [%d]", listP3, r1.ID)
	}

	// Delete r3.
	if err := repo.Delete(r3.ID); err != nil {
		t.Fatal(err)
	}
	if got, _ := repo.GetByPropertyID(2); len(got) != 0 {
		t.Fatalf("GetByPropertyID(2) after delete = %v, want empty", got)
	}

	// Reopen the repo from the same path — hash must persist.
	repo2, err := NewReservationFileRepository(filepath.Join(dir, "reservas.db"))
	if err != nil {
		t.Fatal(err)
	}
	listP3b, _ := repo2.GetByPropertyID(3)
	if len(listP3b) != 1 || listP3b[0].ID != r1.ID {
		t.Fatalf("after reopen GetByPropertyID(3) = %+v, want [%d]", listP3b, r1.ID)
	}
}

func TestReservationRepoRebuildsHashFromDB(t *testing.T) {
	// Simulate a deployment where the .db file exists but the .relhash.*
	// files are missing: the constructor must scan reservations and
	// rebuild the hash so GetByPropertyID keeps working.
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "reservas.db")

	{
		repo, err := NewReservationFileRepository(dbPath)
		if err != nil {
			t.Fatal(err)
		}
		for i := 0; i < 5; i++ {
			if _, err := repo.Create(domain.Reservation{PropertyID: 7, GuestID: i}); err != nil {
				t.Fatal(err)
			}
		}
	}

	// Delete hash files, keep .db.
	if err := removeIfExists(dbPath + ".relhash.dir"); err != nil {
		t.Fatal(err)
	}
	if err := removeIfExists(dbPath + ".relhash.buckets"); err != nil {
		t.Fatal(err)
	}

	repo2, err := NewReservationFileRepository(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	got, err := repo2.GetByPropertyID(7)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 5 {
		t.Fatalf("after hash rebuild GetByPropertyID(7) = %d items, want 5", len(got))
	}
}

func removeIfExists(path string) error {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
