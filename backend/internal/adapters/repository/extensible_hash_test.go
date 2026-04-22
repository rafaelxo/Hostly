package repository

import (
	"math/rand"
	"testing"
)

func TestHashInsertGetDelete(t *testing.T) {
	h := newExtensibleHashIndex(4)

	const n = 1000
	for i := 1; i <= n; i++ {
		h.Insert(i, int64(i*100))
	}
	for i := 1; i <= n; i++ {
		off, ok := h.Get(i)
		if !ok || off != int64(i*100) {
			t.Fatalf("Get(%d): got (%d, %v), want (%d, true)", i, off, ok, i*100)
		}
	}
	for i := 1; i <= n; i++ {
		h.Delete(i)
	}
	for i := 1; i <= n; i++ {
		if _, ok := h.Get(i); ok {
			t.Fatalf("Get(%d) after delete: expected miss, got hit", i)
		}
	}
	if entries := h.Stats().Entries; entries != 0 {
		t.Fatalf("Stats.Entries after deletes = %d, want 0", entries)
	}
}

func TestHashOverwriteOnDuplicate(t *testing.T) {
	h := newExtensibleHashIndex(4)
	h.Insert(42, 100)
	h.Insert(42, 200)

	off, ok := h.Get(42)
	if !ok || off != 200 {
		t.Fatalf("Get(42) after overwrite = (%d, %v), want (200, true)", off, ok)
	}
	if entries := h.Stats().Entries; entries != 1 {
		t.Fatalf("Stats.Entries = %d, want 1", entries)
	}
	snap := h.Snapshot()
	if len(snap) != 1 {
		t.Fatalf("Snapshot length = %d, want 1", len(snap))
	}
}

func TestHashSparseLowBits(t *testing.T) {
	// Keys that share many low bits — forces the split path to walk
	// deeper before distinguishing them. This is the worst case for
	// extendible hashing and the most likely place for the split logic
	// to misbehave (e.g. infinite loop, lost entries).
	h := newExtensibleHashIndex(4)

	keys := []int{0, 16, 32, 48, 64, 80, 96, 112, 128, 144}
	for _, k := range keys {
		h.Insert(k, int64(k+1))
	}
	for _, k := range keys {
		off, ok := h.Get(k)
		if !ok || off != int64(k+1) {
			t.Fatalf("Get(%d) = (%d, %v), want (%d, true)", k, off, ok, k+1)
		}
	}
	if entries := h.Stats().Entries; entries != len(keys) {
		t.Fatalf("Stats.Entries = %d, want %d", entries, len(keys))
	}
}

func TestHashRandomStress(t *testing.T) {
	h := newExtensibleHashIndex(4)

	rng := rand.New(rand.NewSource(1))
	want := make(map[int]int64, 5000)
	for i := 0; i < 5000; i++ {
		key := rng.Intn(100000)
		off := rng.Int63()
		h.Insert(key, off)
		want[key] = off
	}
	for k, v := range want {
		got, ok := h.Get(k)
		if !ok || got != v {
			t.Fatalf("Get(%d) = (%d, %v), want (%d, true)", k, got, ok, v)
		}
	}
	if entries := h.Stats().Entries; entries != len(want) {
		t.Fatalf("Stats.Entries = %d, want %d", entries, len(want))
	}
}

func TestHashSnapshotLoadRoundTrip(t *testing.T) {
	h := newExtensibleHashIndex(4)
	for i := 1; i <= 200; i++ {
		h.Insert(i, int64(i*10))
	}

	snap := h.Snapshot()

	h2 := newExtensibleHashIndex(4)
	h2.Load(snap)

	for i := 1; i <= 200; i++ {
		off, ok := h2.Get(i)
		if !ok || off != int64(i*10) {
			t.Fatalf("after Load, Get(%d) = (%d, %v), want (%d, true)", i, off, ok, i*10)
		}
	}
	if got := h2.Stats().Entries; got != 200 {
		t.Fatalf("after Load, Stats.Entries = %d, want 200", got)
	}
}

func TestHashResetClears(t *testing.T) {
	h := newExtensibleHashIndex(4)
	for i := 1; i <= 50; i++ {
		h.Insert(i, int64(i))
	}
	h.Reset()

	if got := h.Stats().Entries; got != 0 {
		t.Fatalf("after Reset, Stats.Entries = %d, want 0", got)
	}
	if _, ok := h.Get(1); ok {
		t.Fatal("after Reset, Get(1) should miss")
	}
}

func TestHashRequiredBitsMatchesGlobalDepth(t *testing.T) {
	h := newExtensibleHashIndex(4)
	for i := 1; i <= 500; i++ {
		h.Insert(i, int64(i))
	}
	if got, want := h.RequiredBits(), h.globalDepth; got != want {
		t.Fatalf("RequiredBits = %d, want globalDepth %d", got, want)
	}
}
