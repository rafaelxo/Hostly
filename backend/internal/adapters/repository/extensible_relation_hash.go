package repository

import (
	"encoding/binary"
	"os"
	"sync"
)

// extensibleRelationHash is an on-disk extendible hash specialised for
// 1:N relationships (multi-value per key). Unlike extensibleHashIndex,
// which is a unique-key primary index, this structure allows many
// values per key — needed for FK relationships such as Imovel -> Reserva
// (one property can have many reservations).

const relationBucketCapacity = 4

type relationEntry struct {
	key   int32
	value int32
}

type relationBucket struct {
	localDepth uint8
	entries    []relationEntry
}

type extensibleRelationHash struct {
	dirPath     string
	bucketPath  string
	globalDepth uint8
	directory   []uint32
	buckets     []relationBucket
	mu          sync.Mutex
}

func newExtensibleRelationHash(dirPath, bucketPath string) (*extensibleRelationHash, error) {
	h := &extensibleRelationHash{dirPath: dirPath, bucketPath: bucketPath}
	if err := h.load(); err != nil {
		return nil, err
	}
	if len(h.buckets) == 0 {
		h.globalDepth = 0
		h.directory = []uint32{0}
		h.buckets = []relationBucket{{localDepth: 0}}
		if err := h.flush(); err != nil {
			return nil, err
		}
	}
	return h, nil
}

func (h *extensibleRelationHash) IsEmpty() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, b := range h.buckets {
		if len(b.entries) > 0 {
			return false
		}
	}
	return true
}

func (h *extensibleRelationHash) load() error {
	dir, err := os.ReadFile(h.dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if len(dir) < 5 {
		return nil
	}
	h.globalDepth = dir[0]
	size := binary.LittleEndian.Uint32(dir[1:5])
	h.directory = make([]uint32, size)
	for i := uint32(0); i < size; i++ {
		base := 5 + int(i)*4
		h.directory[i] = binary.LittleEndian.Uint32(dir[base : base+4])
	}

	buckets, err := os.ReadFile(h.bucketPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if len(buckets) < 4 {
		return nil
	}
	bucketCount := binary.LittleEndian.Uint32(buckets[0:4])
	h.buckets = make([]relationBucket, bucketCount)
	pos := 4
	for i := uint32(0); i < bucketCount; i++ {
		localDepth := buckets[pos]
		count := binary.LittleEndian.Uint16(buckets[pos+1 : pos+3])
		pos += 3
		entries := make([]relationEntry, count)
		for j := uint16(0); j < count; j++ {
			k := int32(binary.LittleEndian.Uint32(buckets[pos : pos+4]))
			v := int32(binary.LittleEndian.Uint32(buckets[pos+4 : pos+8]))
			entries[j] = relationEntry{key: k, value: v}
			pos += 8
		}
		h.buckets[i] = relationBucket{localDepth: localDepth, entries: entries}
	}
	return nil
}

func (h *extensibleRelationHash) flush() error {
	dirBuf := make([]byte, 5+len(h.directory)*4)
	dirBuf[0] = h.globalDepth
	binary.LittleEndian.PutUint32(dirBuf[1:5], uint32(len(h.directory)))
	for i, b := range h.directory {
		base := 5 + i*4
		binary.LittleEndian.PutUint32(dirBuf[base:base+4], b)
	}
	if err := writeFileAtomic(h.dirPath, dirBuf); err != nil {
		return err
	}

	size := 4
	for _, b := range h.buckets {
		size += 3 + len(b.entries)*8
	}
	bucketBuf := make([]byte, size)
	binary.LittleEndian.PutUint32(bucketBuf[0:4], uint32(len(h.buckets)))
	pos := 4
	for _, b := range h.buckets {
		bucketBuf[pos] = b.localDepth
		binary.LittleEndian.PutUint16(bucketBuf[pos+1:pos+3], uint16(len(b.entries)))
		pos += 3
		for _, e := range b.entries {
			binary.LittleEndian.PutUint32(bucketBuf[pos:pos+4], uint32(e.key))
			binary.LittleEndian.PutUint32(bucketBuf[pos+4:pos+8], uint32(e.value))
			pos += 8
		}
	}
	return writeFileAtomic(h.bucketPath, bucketBuf)
}

func writeFileAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (h *extensibleRelationHash) slot(key int, depth uint8) uint32 {
	if depth == 0 {
		return 0
	}
	return uint32(key) & ((1 << depth) - 1)
}

func (h *extensibleRelationHash) Get(key int) []int {
	h.mu.Lock()
	defer h.mu.Unlock()

	bucket := h.buckets[h.directory[h.slot(key, h.globalDepth)]]
	out := make([]int, 0)
	for _, e := range bucket.entries {
		if int(e.key) == key {
			out = append(out, int(e.value))
		}
	}
	return out
}

func (h *extensibleRelationHash) Add(key, value int) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.insert(int32(key), int32(value))
	return h.flush()
}

func (h *extensibleRelationHash) Remove(key, value int) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	bucket := &h.buckets[h.directory[h.slot(key, h.globalDepth)]]
	for i, e := range bucket.entries {
		if int(e.key) == key && int(e.value) == value {
			bucket.entries = append(bucket.entries[:i], bucket.entries[i+1:]...)
			return h.flush()
		}
	}
	return nil
}

func (h *extensibleRelationHash) insert(key, value int32) {
	for i := 0; i < 64; i++ {
		bucketID := h.directory[h.slot(int(key), h.globalDepth)]
		bucket := &h.buckets[bucketID]

		if len(bucket.entries) < relationBucketCapacity {
			bucket.entries = append(bucket.entries, relationEntry{key: key, value: value})
			return
		}

		if bucket.localDepth == h.globalDepth {
			h.doubleDirectory()
		}
		prevLen := len(bucket.entries)
		h.splitBucket(bucketID)
		// Split made no progress (all entries share enough bits with the
		// new key that they resolve to the same slot at every depth — e.g.
		// many reservations for the same property). Accept overflow.
		if len(h.buckets[bucketID].entries) == prevLen {
			target := h.directory[h.slot(int(key), h.globalDepth)]
			h.buckets[target].entries = append(
				h.buckets[target].entries,
				relationEntry{key: key, value: value},
			)
			return
		}
	}
	panic("extensibleRelationHash: failed to place entry after 64 splits")
}

func (h *extensibleRelationHash) doubleDirectory() {
	newDir := make([]uint32, len(h.directory)*2)
	for i, b := range h.directory {
		newDir[i] = b
		newDir[i+len(h.directory)] = b
	}
	h.directory = newDir
	h.globalDepth++
}

func (h *extensibleRelationHash) splitBucket(bucketID uint32) {
	// Capture entries and clear the source BEFORE appending to h.buckets —
	// an append that reallocates the backing array would otherwise leave
	// the stale pointer writing into the orphaned array.
	oldEntries := h.buckets[bucketID].entries
	h.buckets[bucketID].localDepth++
	h.buckets[bucketID].entries = nil
	newLocalDepth := h.buckets[bucketID].localDepth

	newBucketID := uint32(len(h.buckets))
	h.buckets = append(h.buckets, relationBucket{localDepth: newLocalDepth})

	highBit := uint32(1) << (newLocalDepth - 1)
	for i := range h.directory {
		if h.directory[i] == bucketID && uint32(i)&highBit != 0 {
			h.directory[i] = newBucketID
		}
	}

	for _, e := range oldEntries {
		target := h.directory[h.slot(int(e.key), h.globalDepth)]
		h.buckets[target].entries = append(h.buckets[target].entries, e)
	}
}
