package repository

type indexEntry struct {
	Key    int
	Offset int64
}

type hashBucket struct {
	localDepth int
	entries    map[int]int64
}

type extensibleHashIndex struct {
	bucketSize   int
	globalDepth  int
	directory    []int
	nextBucketID int
	buckets      map[int]*hashBucket
}

type HashIndexStats struct {
	GlobalDepth int `json:"globalDepth"`
	Buckets     int `json:"buckets"`
	Entries     int `json:"entries"`
}

func newExtensibleHashIndex(bucketSize int) *extensibleHashIndex {
	if bucketSize < 2 {
		bucketSize = 4
	}
	return &extensibleHashIndex{
		bucketSize:   bucketSize,
		globalDepth:  1,
		directory:    []int{0, 1},
		nextBucketID: 2,
		buckets: map[int]*hashBucket{
			0: {localDepth: 1, entries: make(map[int]int64)},
			1: {localDepth: 1, entries: make(map[int]int64)},
		},
	}
}

func (h *extensibleHashIndex) Reset() {
	n := newExtensibleHashIndex(h.bucketSize)
	h.globalDepth = n.globalDepth
	h.directory = n.directory
	h.nextBucketID = n.nextBucketID
	h.buckets = n.buckets
}

func (h *extensibleHashIndex) Snapshot() []indexEntry {
	total := 0
	for _, b := range h.buckets {
		total += len(b.entries)
	}
	entries := make([]indexEntry, 0, total)
	for _, bucket := range h.buckets {
		for key, offset := range bucket.entries {
			entries = append(entries, indexEntry{Key: key, Offset: offset})
		}
	}
	return entries
}

func (h *extensibleHashIndex) Load(entries []indexEntry) {
	h.Reset()
	for _, entry := range entries {
		h.Insert(entry.Key, entry.Offset)
	}
}

func (h *extensibleHashIndex) Get(key int) (int64, bool) {
	bucket := h.bucketForKey(key)
	offset, ok := bucket.entries[key]
	return offset, ok
}

func (h *extensibleHashIndex) Delete(key int) {
	bucket := h.bucketForKey(key)
	delete(bucket.entries, key)
}

func (h *extensibleHashIndex) Insert(key int, offset int64) {
	for i := 0; i < 64; i++ {
		bucket := h.bucketForKey(key)
		if _, exists := bucket.entries[key]; exists {
			bucket.entries[key] = offset
			return
		}
		if len(bucket.entries) < h.bucketSize {
			bucket.entries[key] = offset
			return
		}
		h.splitBucketForKey(key)
	}
	panic("extensibleHashIndex: failed to place key after 64 splits")
}

func (h *extensibleHashIndex) Stats() HashIndexStats {
	entries := 0
	for _, b := range h.buckets {
		entries += len(b.entries)
	}
	return HashIndexStats{
		GlobalDepth: h.globalDepth,
		Buckets:     len(h.buckets),
		Entries:     entries,
	}
}

func (h *extensibleHashIndex) RequiredBits() int {
	if h.globalDepth < 1 {
		return 1
	}
	return h.globalDepth
}

func (h *extensibleHashIndex) bucketForKey(key int) *hashBucket {
	return h.buckets[h.directory[h.directoryIndex(key)]]
}

func (h *extensibleHashIndex) directoryIndex(key int) int {
	mask := (1 << h.globalDepth) - 1
	return int(uint32(key)) & mask
}

func (h *extensibleHashIndex) splitBucketForKey(key int) {
	oldBucketID := h.directory[h.directoryIndex(key)]
	oldBucket := h.buckets[oldBucketID]

	if oldBucket.localDepth == h.globalDepth {
		h.growDirectory()
	}

	oldBucket.localDepth++
	newLocalDepth := oldBucket.localDepth

	newBucketID := h.nextBucketID
	h.nextBucketID++
	newBucket := &hashBucket{
		localDepth: newLocalDepth,
		entries:    make(map[int]int64),
	}
	h.buckets[newBucketID] = newBucket

	discriminatorBit := 1 << (newLocalDepth - 1)
	for i, bID := range h.directory {
		if bID == oldBucketID && (i&discriminatorBit) != 0 {
			h.directory[i] = newBucketID
		}
	}

	for entryKey, entryOffset := range oldBucket.entries {
		if h.directory[h.directoryIndex(entryKey)] == newBucketID {
			newBucket.entries[entryKey] = entryOffset
			delete(oldBucket.entries, entryKey)
		}
	}
}

func (h *extensibleHashIndex) growDirectory() {
	oldSize := 1 << h.globalDepth
	h.globalDepth++
	newDir := make([]int, 1<<h.globalDepth)
	for i := range newDir {
		newDir[i] = h.directory[i&(oldSize-1)]
	}
	h.directory = newDir
}
