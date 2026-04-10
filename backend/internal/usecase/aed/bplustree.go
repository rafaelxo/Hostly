package aed

import "backend/internal/domain"

type bplusNode struct {
	leaf     bool
	keys     []float64
	children []*bplusNode
	values   [][]int
	next     *bplusNode
}

type bplusTree struct {
	order int
	root  *bplusNode
	height int
}

func newBPlusTree(order int) *bplusTree {
	if order < 3 {
		order = 3
	}
	root := &bplusNode{leaf: true, keys: []float64{}, values: [][]int{}}
	return &bplusTree{order: order, root: root, height: 1}
}

func (t *bplusTree) Insert(key float64, id int) {
	splitKey, right, split := t.insertRecursive(t.root, key, id)
	if !split {
		return
	}
	newRoot := &bplusNode{
		leaf:     false,
		keys:     []float64{splitKey},
		children: []*bplusNode{t.root, right},
	}
	t.root = newRoot
	t.height++
}

func (t *bplusTree) insertRecursive(node *bplusNode, key float64, id int) (float64, *bplusNode, bool) {
	if node.leaf {
		pos, found := leafSearch(node.keys, key)
		if found {
			node.values[pos] = append(node.values[pos], id)
			return 0, nil, false
		}
		node.keys = insertFloat(node.keys, pos, key)
		node.values = insertIntSlice(node.values, pos, []int{id})
		if len(node.keys) < t.order {
			return 0, nil, false
		}
		return t.splitLeaf(node)
	}

	childIdx := internalChildIndex(node.keys, key)
	splitKey, rightChild, split := t.insertRecursive(node.children[childIdx], key, id)
	if !split {
		return 0, nil, false
	}

	node.keys = insertFloat(node.keys, childIdx, splitKey)
	node.children = insertNode(node.children, childIdx+1, rightChild)
	if len(node.keys) < t.order {
		return 0, nil, false
	}
	return t.splitInternal(node)
}

func (t *bplusTree) splitLeaf(node *bplusNode) (float64, *bplusNode, bool) {
	mid := len(node.keys) / 2
	right := &bplusNode{
		leaf:   true,
		keys:   append([]float64(nil), node.keys[mid:]...),
		values: append([][]int(nil), node.values[mid:]...),
		next:   node.next,
	}
	node.keys = node.keys[:mid]
	node.values = node.values[:mid]
	node.next = right
	return right.keys[0], right, true
}

func (t *bplusTree) splitInternal(node *bplusNode) (float64, *bplusNode, bool) {
	mid := len(node.keys) / 2
	promoted := node.keys[mid]
	right := &bplusNode{
		leaf:     false,
		keys:     append([]float64(nil), node.keys[mid+1:]...),
		children: append([]*bplusNode(nil), node.children[mid+1:]...),
	}
	node.keys = node.keys[:mid]
	node.children = node.children[:mid+1]
	return promoted, right, true
}

func (t *bplusTree) Search(key float64) []int {
	node := t.root
	for !node.leaf {
		idx := internalChildIndex(node.keys, key)
		node = node.children[idx]
	}
	idx, found := leafSearch(node.keys, key)
	if !found {
		return []int{}
	}
	return append([]int(nil), node.values[idx]...)
}

func (t *bplusTree) Stats() BPlusTreeStats {
	leafCount := 0
	keyCount := 0
	node := leftmostLeaf(t.root)
	for node != nil {
		leafCount++
		keyCount += len(node.keys)
		node = node.next
	}
	return BPlusTreeStats{
		Ordem:            t.order,
		Altura:           t.height,
		QuantidadeChaves: keyCount,
		QuantidadeFolhas: leafCount,
	}
}

func leftmostLeaf(node *bplusNode) *bplusNode {
	for node != nil && !node.leaf {
		node = node.children[0]
	}
	return node
}

func leafSearch(keys []float64, key float64) (int, bool) {
	lo, hi := 0, len(keys)
	for lo < hi {
		mid := (lo + hi) / 2
		if keys[mid] < key {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	if lo < len(keys) && keys[lo] == key {
		return lo, true
	}
	return lo, false
}

func internalChildIndex(keys []float64, key float64) int {
	idx := 0
	for idx < len(keys) && key >= keys[idx] {
		idx++
	}
	return idx
}

func insertFloat(values []float64, idx int, v float64) []float64 {
	values = append(values, 0)
	copy(values[idx+1:], values[idx:])
	values[idx] = v
	return values
}

func insertIntSlice(values [][]int, idx int, v []int) [][]int {
	values = append(values, nil)
	copy(values[idx+1:], values[idx:])
	values[idx] = v
	return values
}

func insertNode(values []*bplusNode, idx int, v *bplusNode) []*bplusNode {
	values = append(values, nil)
	copy(values[idx+1:], values[idx:])
	values[idx] = v
	return values
}

func (s *service) SearchPropertiesByDailyRateBPlus(dailyRate float64) (BPlusSearchResult, error) {
	if dailyRate < 0 {
		return BPlusSearchResult{}, domain.ErrInvalidEntity
	}

	items, err := s.propertyReader.GetAll()
	if err != nil {
		return BPlusSearchResult{}, err
	}

	tree := newBPlusTree(4)
	for _, item := range items {
		tree.Insert(item.DailyRate, item.ID)
	}

	ids := tree.Search(dailyRate)
	idSet := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		idSet[id] = struct{}{}
	}

	matched := make([]domain.Property, 0, len(ids))
	for _, item := range items {
		if _, ok := idSet[item.ID]; ok {
			matched = append(matched, item)
		}
	}

	return BPlusSearchResult{
		ValorDiaria: dailyRate,
		IDs:         ids,
		Imoveis:     matched,
		Arvore:      tree.Stats(),
	}, nil
}
