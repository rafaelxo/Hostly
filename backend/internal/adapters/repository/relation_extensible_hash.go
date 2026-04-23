package repository

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

type multiIndexEntry struct {
	Key    int
	Values []int64
}

type multiHashBucket struct {
	localDepth int
	entries    map[int][]int64
}

type multiExtensibleHashIndex struct {
	bucketSize   int
	globalDepth  int
	directory    []int
	nextBucketID int
	buckets      map[int]*multiHashBucket
	path         string
	mu           sync.Mutex
}

func newMultiExtensibleHashIndex(path string, bucketSize int) (*multiExtensibleHashIndex, error) {
	if bucketSize < 2 {
		bucketSize = 4
	}
	h := &multiExtensibleHashIndex{
		bucketSize:   bucketSize,
		globalDepth:  1,
		directory:    make([]int, 2),
		nextBucketID: 2,
		buckets: map[int]*multiHashBucket{
			0: {localDepth: 1, entries: make(map[int][]int64)},
			1: {localDepth: 1, entries: make(map[int][]int64)},
		},
		path: path,
	}
	h.directory[0] = 0
	h.directory[1] = 1
	if err := h.ensureFile(); err != nil {
		return nil, err
	}
	if err := h.loadFromFile(); err != nil {
		if err := h.persistToFile(); err != nil {
			return nil, err
		}
	}
	return h, nil
}

func (h *multiExtensibleHashIndex) ensureFile() error {
	if err := os.MkdirAll(filepath.Dir(h.path), 0o755); err != nil {
		return err
	}
	file, err := os.OpenFile(h.path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	return file.Close()
}

func (h *multiExtensibleHashIndex) Reset() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.globalDepth = 1
	h.directory = make([]int, 2)
	h.nextBucketID = 2
	h.buckets = map[int]*multiHashBucket{
		0: {localDepth: 1, entries: make(map[int][]int64)},
		1: {localDepth: 1, entries: make(map[int][]int64)},
	}
	h.directory[0] = 0
	h.directory[1] = 1
}

func (h *multiExtensibleHashIndex) Snapshot() []multiIndexEntry {
	h.mu.Lock()
	defer h.mu.Unlock()
	entries := make([]multiIndexEntry, 0)
	for _, bucket := range h.buckets {
		for key, values := range bucket.entries {
			copied := append([]int64(nil), values...)
			entries = append(entries, multiIndexEntry{Key: key, Values: copied})
		}
	}
	return entries
}

func (h *multiExtensibleHashIndex) Load(entries []multiIndexEntry) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.resetLocked()
	for _, entry := range entries {
		for _, value := range entry.Values {
			h.insertLocked(entry.Key, value)
		}
	}
}

func (h *multiExtensibleHashIndex) Get(key int) ([]int64, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	bucket := h.bucketForKey(key)
	values, ok := bucket.entries[key]
	if !ok {
		return nil, false
	}
	return append([]int64(nil), values...), true
}

func (h *multiExtensibleHashIndex) Insert(key int, value int64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.insertLocked(key, value)
}

func (h *multiExtensibleHashIndex) Delete(key int, value int64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	bucket := h.bucketForKey(key)
	values, ok := bucket.entries[key]
	if !ok {
		return
	}
	filtered := values[:0]
	for _, current := range values {
		if current != value {
			filtered = append(filtered, current)
		}
	}
	if len(filtered) == 0 {
		delete(bucket.entries, key)
		return
	}
	bucket.entries[key] = append([]int64(nil), filtered...)
}

func (h *multiExtensibleHashIndex) Stats() HashIndexStats {
	h.mu.Lock()
	defer h.mu.Unlock()
	entries := 0
	for _, b := range h.buckets {
		for _, values := range b.entries {
			entries += len(values)
		}
	}
	return HashIndexStats{
		GlobalDepth: h.globalDepth,
		Buckets:     len(h.buckets),
		Entries:     entries,
	}
}

func (h *multiExtensibleHashIndex) insertLocked(key int, value int64) {
	for {
		bucket := h.bucketForKey(key)
		if values, exists := bucket.entries[key]; exists {
			for _, current := range values {
				if current == value {
					return
				}
			}
			bucket.entries[key] = append(values, value)
			return
		}
		if len(bucket.entries) < h.bucketSize {
			bucket.entries[key] = []int64{value}
			return
		}
		h.splitBucketForKey(key)
	}
}

func (h *multiExtensibleHashIndex) resetLocked() {
	h.globalDepth = 1
	h.directory = make([]int, 2)
	h.nextBucketID = 2
	h.buckets = map[int]*multiHashBucket{
		0: {localDepth: 1, entries: make(map[int][]int64)},
		1: {localDepth: 1, entries: make(map[int][]int64)},
	}
	h.directory[0] = 0
	h.directory[1] = 1
}

func (h *multiExtensibleHashIndex) bucketForKey(key int) *multiHashBucket {
	dirIndex := h.directoryIndex(key)
	bucketID := h.directory[dirIndex]
	return h.buckets[bucketID]
}

func (h *multiExtensibleHashIndex) directoryIndex(key int) int {
	mask := (1 << h.globalDepth) - 1
	return int(uint32(key)) & mask
}

func (h *multiExtensibleHashIndex) splitBucketForKey(key int) {
	dirIndex := h.directoryIndex(key)
	oldBucketID := h.directory[dirIndex]
	oldBucket := h.buckets[oldBucketID]

	if oldBucket.localDepth == h.globalDepth {
		h.growDirectory()
	}

	oldBucket.localDepth++
	newBucketID := h.nextBucketID
	h.nextBucketID++
	newBucket := &multiHashBucket{
		localDepth: oldBucket.localDepth,
		entries:    make(map[int][]int64),
	}
	h.buckets[newBucketID] = newBucket

	discriminatorBit := 1 << (oldBucket.localDepth - 1)
	for i, bID := range h.directory {
		if bID != oldBucketID {
			continue
		}
		if (i & discriminatorBit) != 0 {
			h.directory[i] = newBucketID
		}
	}

	for entryKey, entryValues := range oldBucket.entries {
		idx := h.directoryIndex(entryKey)
		targetBucketID := h.directory[idx]
		if targetBucketID == newBucketID {
			newBucket.entries[entryKey] = append([]int64(nil), entryValues...)
			delete(oldBucket.entries, entryKey)
		}
	}
}

func (h *multiExtensibleHashIndex) growDirectory() {
	old := h.directory
	h.globalDepth++
	h.directory = make([]int, 1<<h.globalDepth)
	for i := range h.directory {
		h.directory[i] = old[i%(1<<(h.globalDepth-1))]
	}
}

func (h *multiExtensibleHashIndex) persistToFile() error {
	h.mu.Lock()
	defer h.mu.Unlock()
	entries := make([]multiIndexEntry, 0)
	for _, bucket := range h.buckets {
		for key, values := range bucket.entries {
			entries = append(entries, multiIndexEntry{Key: key, Values: append([]int64(nil), values...)})
		}
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Key < entries[j].Key })
	tempPath := h.path + ".tmp"
	file, err := os.OpenFile(tempPath, os.O_CREATE|os.O_TRUNC|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}

	if _, err := file.Write([]byte{1}); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	var countBuf [4]byte
	binary.LittleEndian.PutUint32(countBuf[:], uint32(len(entries)))
	if _, err := file.Write(countBuf[:]); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	for _, entry := range entries {
		var keyBuf [4]byte
		binary.LittleEndian.PutUint32(keyBuf[:], uint32(int32(entry.Key)))
		if _, err := file.Write(keyBuf[:]); err != nil {
			_ = os.Remove(tempPath)
			return err
		}
		var valueCount [4]byte
		binary.LittleEndian.PutUint32(valueCount[:], uint32(len(entry.Values)))
		if _, err := file.Write(valueCount[:]); err != nil {
			_ = os.Remove(tempPath)
			return err
		}
		for _, value := range entry.Values {
			var valueBuf [8]byte
			binary.LittleEndian.PutUint64(valueBuf[:], uint64(value))
			if _, err := file.Write(valueBuf[:]); err != nil {
				_ = os.Remove(tempPath)
				return err
			}
		}
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	if err := os.Remove(h.path); err != nil && !os.IsNotExist(err) {
		_ = os.Remove(tempPath)
		return err
	}
	return os.Rename(tempPath, h.path)
}

func (h *multiExtensibleHashIndex) loadFromFile() error {
	file, err := os.OpenFile(h.path, os.O_RDONLY, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()
	buf := make([]byte, 5)
	if _, err := io.ReadFull(file, buf); err != nil {
		return err
	}
	if buf[0] != 1 {
		return fmt.Errorf("invalid relation index version")
	}
	count := binary.LittleEndian.Uint32(buf[1:5])
	entries := make([]multiIndexEntry, 0, count)
	for i := uint32(0); i < count; i++ {
		var keyBuf [4]byte
		if _, err := io.ReadFull(file, keyBuf[:]); err != nil {
			return err
		}
		var valueCountBuf [4]byte
		if _, err := io.ReadFull(file, valueCountBuf[:]); err != nil {
			return err
		}
		valueCount := binary.LittleEndian.Uint32(valueCountBuf[:])
		values := make([]int64, 0, valueCount)
		for j := uint32(0); j < valueCount; j++ {
			var valueBuf [8]byte
			if _, err := io.ReadFull(file, valueBuf[:]); err != nil {
				return err
			}
			values = append(values, int64(binary.LittleEndian.Uint64(valueBuf[:])))
		}
		entries = append(entries, multiIndexEntry{Key: int(int32(binary.LittleEndian.Uint32(keyBuf[:]))), Values: values})
	}
	h.Load(entries)
	return nil
}
