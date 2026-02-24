package main

import (
	"log"
	"net/http"

	web "backend/internal/adapters/web"
	"backend/internal/adapters/repository"
	reservationuc "backend/internal/usecase/reservation"
	useruc "backend/internal/usecase/user"
	"backend/internal/usecase/property"
)

func main() {
	propertyRepo, err := repository.NewPropertyFileRepository("data/imoveis.db")
	if err != nil {
		log.Fatalf("erro ao inicializar repositorio de imoveis: %v", err)
	}

	userRepo, err := repository.NewUserFileRepository("data/usuarios.db")
	if err != nil {
		log.Fatalf("erro ao inicializar repositorio de usuarios: %v", err)
	}

	reservationRepo, err := repository.NewReservationFileRepository("data/reservas.db")
	if err != nil {
		log.Fatalf("erro ao inicializar repositorio de reservas: %v", err)
	}

	propertyService := property.NewService(propertyRepo)
	userService := useruc.NewService(userRepo)
	reservationService := reservationuc.NewService(reservationRepo, propertyRepo)

	router := web.NewRouter(web.Dependencies{
		PropertyService:    propertyService,
		UserService:        userService,
		ReservationService: reservationService,
	})

	addr := ":8080"
	log.Printf("Hostly backend iniciado em %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}


