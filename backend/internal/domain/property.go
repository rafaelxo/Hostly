package domain

import (
	"fmt"
	"net/url"
	"strings"
	"time"
)

type Address struct {
	Street       string `json:"rua"`
	Number       string `json:"numero"`
	Neighborhood string `json:"bairro"`
	City         string `json:"cidade"`
	State        string `json:"estado"`
	ZipCode      string `json:"cep"`
}

type Amenity struct {
	Name        string `json:"nome"`
	Description string `json:"descricao,omitempty"`
}

type Property struct {
	ID          int       `json:"idImovel"`
	UserID      int       `json:"idUsuario"`
	Title       string    `json:"titulo"`
	Description string    `json:"descricao"`
	Address     Address   `json:"endereco"`
	Amenities   []Amenity `json:"comodidades"`
	City        string    `json:"cidade"`
	DailyRate   float64   `json:"valorDiaria"`
	CreatedAt   string    `json:"dataCadastro"`
	Photos      []string  `json:"fotos"`
	Active      bool      `json:"ativo"`
}

func (p Property) Validate() error {
	p.Normalize()

	if p.UserID <= 0 {
		return fmt.Errorf("%w: idUsuario invalido", ErrInvalidEntity)
	}

	if len(p.Title) < 4 || len(p.Title) > 120 {
		return fmt.Errorf("%w: titulo deve ter entre 4 e 120 caracteres", ErrInvalidEntity)
	}

	if strings.TrimSpace(p.Description) == "" {
		return fmt.Errorf("%w: descricao obrigatoria", ErrInvalidEntity)
	}

	if p.DailyRate <= 0 {
		return fmt.Errorf("%w: valorDiaria deve ser maior que zero", ErrInvalidEntity)
	}

	if err := validateAddress(p.Address); err != nil {
		return err
	}

	if p.City != p.Address.City {
		return fmt.Errorf("%w: cidade deve coincidir com endereco.cidade", ErrInvalidEntity)
	}

	if len(p.Photos) == 0 {
		return fmt.Errorf("%w: pelo menos uma foto e obrigatoria", ErrInvalidEntity)
	}

	for _, photo := range p.Photos {
		if !isValidPhotoURL(photo) {
			return fmt.Errorf("%w: foto invalida (%s)", ErrInvalidEntity, photo)
		}
	}

	for _, amenity := range p.Amenities {
		if strings.TrimSpace(amenity.Name) == "" {
			return fmt.Errorf("%w: comodidade com nome vazio", ErrInvalidEntity)
		}
	}

	if len(p.Amenities) > 20 {
		return fmt.Errorf("%w: maximo de 20 comodidades", ErrInvalidEntity)
	}

	if p.CreatedAt == "" {
		return nil
	}

	if _, err := time.Parse("2006-01-02", p.CreatedAt); err != nil {
		return fmt.Errorf("%w: dataCadastro deve estar no formato YYYY-MM-DD", ErrInvalidEntity)
	}

	return nil
}

func (p *Property) Normalize() {
	p.Title = strings.TrimSpace(p.Title)
	p.Description = strings.TrimSpace(p.Description)
	p.Address = normalizeAddress(p.Address)
	p.City = strings.TrimSpace(p.Address.City)

	for i := range p.Photos {
		p.Photos[i] = strings.TrimSpace(p.Photos[i])
	}

	for i := range p.Amenities {
		p.Amenities[i].Name = strings.TrimSpace(p.Amenities[i].Name)
		p.Amenities[i].Description = strings.TrimSpace(p.Amenities[i].Description)
	}
}

func normalizeAddress(a Address) Address {
	a.Street = strings.TrimSpace(a.Street)
	a.Number = strings.TrimSpace(a.Number)
	a.Neighborhood = strings.TrimSpace(a.Neighborhood)
	a.City = strings.TrimSpace(a.City)
	a.State = strings.TrimSpace(a.State)
	a.ZipCode = strings.TrimSpace(a.ZipCode)
	return a
}

func validateAddress(a Address) error {
	a = normalizeAddress(a)
	if a.Street == "" || a.Number == "" || a.Neighborhood == "" || a.City == "" || len(a.State) < 2 || a.ZipCode == "" {
		return fmt.Errorf("%w: endereco incompleto", ErrInvalidEntity)
	}
	if len(a.ZipCode) < 8 || len(a.ZipCode) > 10 {
		return fmt.Errorf("%w: cep deve ter entre 8 e 10 caracteres", ErrInvalidEntity)
	}
	return nil
}

func isValidPhotoURL(value string) bool {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	return parsed.Host != ""
}
