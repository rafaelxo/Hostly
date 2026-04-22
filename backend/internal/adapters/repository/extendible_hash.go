package repository

import (
	"encoding/binary"
	"os"
	"sync"
)

const (
	bucketCapacity = 4
	bucketSlotSize = 2 + bucketCapacity*8 // localDepth + count + 4*(int32 key, int32 value)
)

type hashEntry struct {
	key   int32
	value int32
}

type hashBucket struct {
	localDepth uint8
	entries    []hashEntry
}

type extendibleHash struct {
	dirPath     string
	bucketPath  string
	globalDepth uint8
	directory   []uint32
	buckets     []hashBucket
	mu          sync.Mutex
}

func newExtendibleHash(dirPath, bucketPath string) (*extendibleHash, error) {
	h := &extendibleHash{dirPath: dirPath, bucketPath: bucketPath}
	if err := h.load(); err != nil {
		return nil, err
	}
	if len(h.buckets) == 0 {
		h.globalDepth = 0
		h.directory = []uint32{0}
		h.buckets = []hashBucket{{localDepth: 0, entries: nil}}
		if err := h.flush(); err != nil {
			return nil, err
		}
	}
	return h, nil
}

func (h *extendibleHash) load() error {
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
	count := len(buckets) / bucketSlotSize
	h.buckets = make([]hashBucket, count)
	for i := 0; i < count; i++ {
		base := i * bucketSlotSize
		localDepth := buckets[base]
		cnt := int(buckets[base+1])
		entries := make([]hashEntry, 0, cnt)
		for j := 0; j < cnt; j++ {
			eb := base + 2 + j*8
			k := int32(binary.LittleEndian.Uint32(buckets[eb : eb+4]))
			v := int32(binary.LittleEndian.Uint32(buckets[eb+4 : eb+8]))
			entries = append(entries, hashEntry{key: k, value: v})
		}
		h.buckets[i] = hashBucket{localDepth: localDepth, entries: entries}
	}
	return nil
}

func (h *extendibleHash) flush() error {
	dirBuf := make([]byte, 5+len(h.directory)*4)
	dirBuf[0] = h.globalDepth
	binary.LittleEndian.PutUint32(dirBuf[1:5], uint32(len(h.directory)))
	for i, b := range h.directory {
		base := 5 + i*4
		binary.LittleEndian.PutUint32(dirBuf[base:base+4], b)
	}
	if err := writeAtomic(h.dirPath, dirBuf); err != nil {
		return err
	}

	bucketBuf := make([]byte, len(h.buckets)*bucketSlotSize)
	for i, b := range h.buckets {
		base := i * bucketSlotSize
		bucketBuf[base] = b.localDepth
		bucketBuf[base+1] = byte(len(b.entries))
		for j, e := range b.entries {
			eb := base + 2 + j*8
			binary.LittleEndian.PutUint32(bucketBuf[eb:eb+4], uint32(e.key))
			binary.LittleEndian.PutUint32(bucketBuf[eb+4:eb+8], uint32(e.value))
		}
	}
	return writeAtomic(h.bucketPath, bucketBuf)
}

func writeAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (h *extendibleHash) hashSlot(key int, depth uint8) uint32 {
	if depth == 0 {
		return 0
	}
	return uint32(key) & ((1 << depth) - 1)
}

func (h *extendibleHash) Get(key int) ([]int, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	slot := h.hashSlot(key, h.globalDepth)
	bucketID := h.directory[slot]
	bucket := h.buckets[bucketID]

	out := make([]int, 0)
	for _, e := range bucket.entries {
		if int(e.key) == key {
			out = append(out, int(e.value))
		}
	}
	return out, nil
}

func (h *extendibleHash) Add(key, value int) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.insert(int32(key), int32(value))
	return h.flush()
}

func (h *extendibleHash) Remove(key, value int) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	slot := h.hashSlot(key, h.globalDepth)
	bucketID := h.directory[slot]
	bucket := &h.buckets[bucketID]
	for i, e := range bucket.entries {
		if int(e.key) == key && int(e.value) == value {
			bucket.entries = append(bucket.entries[:i], bucket.entries[i+1:]...)
			return h.flush()
		}
	}
	return nil
}

func (h *extendibleHash) insert(key, value int32) {
	for {
		slot := h.hashSlot(int(key), h.globalDepth)
		bucketID := h.directory[slot]
		bucket := &h.buckets[bucketID]

		if len(bucket.entries) < bucketCapacity {
			bucket.entries = append(bucket.entries, hashEntry{key: key, value: value})
			return
		}

		if bucket.localDepth == h.globalDepth {
			h.doubleDirectory()
		}
		h.splitBucket(bucketID)
	}
}

func (h *extendibleHash) doubleDirectory() {
	newDir := make([]uint32, len(h.directory)*2)
	for i, b := range h.directory {
		newDir[i] = b
		newDir[i+len(h.directory)] = b
	}
	h.directory = newDir
	h.globalDepth++
}

func (h *extendibleHash) splitBucket(bucketID uint32) {
	old := &h.buckets[bucketID]
	old.localDepth++
	newLocalDepth := old.localDepth

	newBucketID := uint32(len(h.buckets))
	h.buckets = append(h.buckets, hashBucket{localDepth: newLocalDepth, entries: nil})

	// High bit that distinguishes old vs new after the split.
	highBit := uint32(1) << (newLocalDepth - 1)

	// Update directory: slots that currently point to bucketID AND have the
	// distinguishing bit set should now point to the new bucket.
	for i := range h.directory {
		if h.directory[i] == bucketID && uint32(i)&highBit != 0 {
			h.directory[i] = newBucketID
		}
	}

	// Redistribute entries.
	oldEntries := old.entries
	old.entries = nil
	for _, e := range oldEntries {
		slot := h.hashSlot(int(e.key), h.globalDepth)
		target := h.directory[slot]
		h.buckets[target].entries = append(h.buckets[target].entries, e)
	}
}

