package repository

import (
	"encoding/binary"
	"io"
	"os"
	"sort"
	"sync"
)

const primaryIndexEntrySize = 12 // int32 id + int64 offset

type primaryIndex struct {
	path    string
	entries map[int]int64
	mu      sync.Mutex
}

func newPrimaryIndex(path string) (*primaryIndex, error) {
	p := &primaryIndex{path: path, entries: map[int]int64{}}
	if err := p.load(); err != nil {
		return nil, err
	}
	return p, nil
}

func (p *primaryIndex) load() error {
	file, err := os.OpenFile(p.path, os.O_RDONLY, 0o644)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer file.Close()

	var count uint32
	if err := binary.Read(file, binary.LittleEndian, &count); err != nil {
		if err == io.EOF {
			return nil
		}
		return err
	}

	for i := uint32(0); i < count; i++ {
		var id int32
		var off int64
		if err := binary.Read(file, binary.LittleEndian, &id); err != nil {
			return err
		}
		if err := binary.Read(file, binary.LittleEndian, &off); err != nil {
			return err
		}
		p.entries[int(id)] = off
	}
	return nil
}

func (p *primaryIndex) Get(id int) (int64, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	off, ok := p.entries[id]
	return off, ok
}

func (p *primaryIndex) Has(id int) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	_, ok := p.entries[id]
	return ok
}

func (p *primaryIndex) Put(id int, off int64) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.entries[id] = off
	return p.flush()
}

func (p *primaryIndex) Delete(id int) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.entries, id)
	return p.flush()
}

func (p *primaryIndex) Rebuild(entries map[int]int64) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.entries = entries
	return p.flush()
}

func (p *primaryIndex) flush() error {
	ids := make([]int, 0, len(p.entries))
	for id := range p.entries {
		ids = append(ids, id)
	}
	sort.Ints(ids)

	buf := make([]byte, 4+len(ids)*primaryIndexEntrySize)
	binary.LittleEndian.PutUint32(buf[0:4], uint32(len(ids)))
	for i, id := range ids {
		base := 4 + i*primaryIndexEntrySize
		binary.LittleEndian.PutUint32(buf[base:base+4], uint32(int32(id)))
		binary.LittleEndian.PutUint64(buf[base+4:base+12], uint64(p.entries[id]))
	}

	tmp := p.path + ".tmp"
	if err := os.WriteFile(tmp, buf, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, p.path)
}
