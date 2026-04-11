package amenity

import "backend/internal/domain"

var commonAmenities = []domain.AmenityCatalogItem{
	{Name: "Wi-Fi", Description: "Internet sem fio", Icon: "wifi", Active: true},
	{Name: "Ar-condicionado", Description: "Climatização do ambiente", Icon: "snowflake", Active: true},
	{Name: "Cozinha equipada", Description: "Fogão, geladeira e utensílios", Icon: "utensils", Active: true},
	{Name: "Máquina de lavar", Description: "Lavanderia disponível", Icon: "shirt", Active: true},
	{Name: "Estacionamento", Description: "Vaga para veículo", Icon: "car", Active: true},
	{Name: "Piscina", Description: "Área de lazer com piscina", Icon: "waves", Active: true},
	{Name: "Academia", Description: "Espaço fitness", Icon: "dumbbell", Active: true},
	{Name: "TV", Description: "Televisão no imóvel", Icon: "tv", Active: true},
	{Name: "Pet-friendly", Description: "Aceita animais de estimação", Icon: "paw-print", Active: true},
	{Name: "Churrasqueira", Description: "Área gourmet com churrasqueira", Icon: "flame", Active: true},
	{Name: "Varanda", Description: "Espaço externo privativo", Icon: "sun", Active: true},
	{Name: "Vista para o mar", Description: "Visual privilegiado", Icon: "mountain", Active: true},
}

func (s *service) GetAllActive() ([]domain.AmenityCatalogItem, error) {
	items, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	active := make([]domain.AmenityCatalogItem, 0, len(items))
	for _, item := range items {
		if item.Active {
			active = append(active, item)
		}
	}
	return active, nil
}

func (s *service) SeedCommonAmenities() error {
	current, err := s.repo.GetAll()
	if err != nil {
		return err
	}
	if len(current) > 0 {
		return nil
	}

	for _, amenity := range commonAmenities {
		amenity.Normalize()
		if err := amenity.Validate(); err != nil {
			continue
		}
		if _, err := s.repo.Create(amenity); err != nil {
			return err
		}
	}

	return nil
}
