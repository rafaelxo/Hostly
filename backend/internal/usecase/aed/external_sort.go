package aed

import (
	"backend/internal/domain"
	"sort"
)

const defaultRunSize = 4

func (s *service) ExternalSortProperties(attribute string, asc bool) (ExternalSortResult, error) {
	sanitized, err := sanitizeSortAttribute(attribute)
	if err != nil {
		return ExternalSortResult{}, err
	}

	items, err := s.propertyReader.GetAll()
	if err != nil {
		return ExternalSortResult{}, err
	}

	if len(items) == 0 {
		return ExternalSortResult{
			Metadados: ExternalSortMetadata{
				Atributo:           sanitized,
				Ordem:              sortOrderLabel(asc),
				RunsGeradas:        0,
				RegistrosOrdenados: 0,
			},
			Itens: []domain.Property{},
		}, nil
	}

	runs := generateSortedRuns(items, sanitized, asc, defaultRunSize)
	merged := mergeRuns(runs, sanitized, asc)

	return ExternalSortResult{
		Metadados: ExternalSortMetadata{
			Atributo:           sanitized,
			Ordem:              sortOrderLabel(asc),
			RunsGeradas:        len(runs),
			RegistrosOrdenados: len(merged),
		},
		Itens: merged,
	}, nil
}

func generateSortedRuns(items []domain.Property, attribute string, asc bool, runSize int) [][]domain.Property {
	runs := make([][]domain.Property, 0)
	for start := 0; start < len(items); start += runSize {
		end := start + runSize
		if end > len(items) {
			end = len(items)
		}
		run := append([]domain.Property(nil), items[start:end]...)
		sort.Slice(run, func(i, j int) bool {
			return lessProperty(run[i], run[j], attribute, asc)
		})
		runs = append(runs, run)
	}
	return runs
}

func mergeRuns(runs [][]domain.Property, attribute string, asc bool) []domain.Property {
	type runCursor struct {
		runIdx int
		idx    int
	}

	result := make([]domain.Property, 0)
	cursors := make([]runCursor, 0, len(runs))
	for i := range runs {
		if len(runs[i]) > 0 {
			cursors = append(cursors, runCursor{runIdx: i, idx: 0})
		}
	}

	for len(cursors) > 0 {
		best := 0
		for i := 1; i < len(cursors); i++ {
			a := runs[cursors[i].runIdx][cursors[i].idx]
			b := runs[cursors[best].runIdx][cursors[best].idx]
			if lessProperty(a, b, attribute, asc) {
				best = i
			}
		}

		selected := &cursors[best]
		result = append(result, runs[selected.runIdx][selected.idx])
		selected.idx++
		if selected.idx >= len(runs[selected.runIdx]) {
			cursors = append(cursors[:best], cursors[best+1:]...)
		}
	}

	return result
}

func lessProperty(a domain.Property, b domain.Property, attribute string, asc bool) bool {
	var less bool
	switch attribute {
	case "valorDiaria":
		if a.DailyRate == b.DailyRate {
			less = a.ID < b.ID
		} else {
			less = a.DailyRate < b.DailyRate
		}
	case "cidade":
		if a.City == b.City {
			less = a.ID < b.ID
		} else {
			less = a.City < b.City
		}
	case "dataCadastro":
		if a.CreatedAt == b.CreatedAt {
			less = a.ID < b.ID
		} else {
			less = a.CreatedAt < b.CreatedAt
		}
	default:
		if a.Title == b.Title {
			less = a.ID < b.ID
		} else {
			less = a.Title < b.Title
		}
	}

	if asc {
		return less
	}
	return !less
}

func sortOrderLabel(asc bool) string {
	if asc {
		return "asc"
	}
	return "desc"
}
