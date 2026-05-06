package domain

import (
	"fmt"
	"strings"
	"time"
)

type Favorite struct {
	UserID     int    `json:"idUsuario"`
	PropertyID int    `json:"idImovel"`
	CreatedAt  string `json:"dataCadastro"`
	Active     bool   `json:"ativo"`
}

func (f Favorite) Validate() error {
	if f.UserID <= 0 {
		return fmt.Errorf("%w: idUsuario invalido", ErrInvalidEntity)
	}
	if f.PropertyID <= 0 {
		return fmt.Errorf("%w: idImovel invalido", ErrInvalidEntity)
	}
	if strings.TrimSpace(f.CreatedAt) == "" {
		return fmt.Errorf("%w: dataCadastro obrigatoria", ErrInvalidEntity)
	}
	if _, err := time.Parse("2006-01-02", f.CreatedAt); err != nil {
		return fmt.Errorf("%w: dataCadastro deve estar no formato YYYY-MM-DD", ErrInvalidEntity)
	}
	return nil
}

func (f *Favorite) Normalize() {
	f.CreatedAt = strings.TrimSpace(f.CreatedAt)
}
