package main

import (
	"backend/internal/adapters/payment"
	"backend/internal/adapters/repository"
	web "backend/internal/adapters/web"
	aeduc "backend/internal/usecase/aed"
	amenityuc "backend/internal/usecase/amenity"
	authuc "backend/internal/usecase/auth"
	"backend/internal/usecase/property"
	reservationuc "backend/internal/usecase/reservation"
	useruc "backend/internal/usecase/user"
	"log"
	"net/http"
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

	amenityRepo, err := repository.NewAmenityFileRepository("data/comodidades.db")
	if err != nil {
		log.Fatalf("erro ao inicializar repositorio de comodidades: %v", err)
	}

	propertyService := property.NewService(propertyRepo, userRepo)
	userService := useruc.NewService(userRepo)
	paymentGateway := payment.NewSimulatedGateway()
	reservationService := reservationuc.NewService(reservationRepo, propertyRepo, userRepo, paymentGateway)
	amenityService := amenityuc.NewService(amenityRepo)
	aedService := aeduc.NewService(
		propertyService,
		reservationService,
		func() aeduc.HashStats {
			stats := propertyRepo.HashStats()
			return aeduc.HashStats{GlobalDepth: stats.GlobalDepth, Buckets: stats.Buckets, Entries: stats.Entries}
		},
		func() aeduc.HashStats {
			stats := userRepo.HashStats()
			return aeduc.HashStats{GlobalDepth: stats.GlobalDepth, Buckets: stats.Buckets, Entries: stats.Entries}
		},
		func() aeduc.HashStats {
			stats := reservationRepo.HashStats()
			return aeduc.HashStats{GlobalDepth: stats.GlobalDepth, Buckets: stats.Buckets, Entries: stats.Entries}
		},
	)
	authService := authuc.NewService(userService, propertyService)

	if _, err := authService.SeedDefaultAdmin(); err != nil {
		log.Fatalf("erro ao criar admin padrao: %v", err)
	}

	if err := amenityService.SeedCommonAmenities(); err != nil {
		log.Fatalf("erro ao preparar comodidades iniciais: %v", err)
	}

	router := web.NewRouter(web.Dependencies{
		PropertyService:    propertyService,
		UserService:        userService,
		ReservationService: reservationService,
		AuthService:        authService,
		AmenityService:     amenityService,
		AEDService:         aedService,
	})

	addr := "8080"
	log.Printf("Hostly backend iniciado em: %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}
