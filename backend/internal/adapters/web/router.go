package web

import (
	"backend/internal/adapters/web/handler"
	aeduc "backend/internal/usecase/aed"
	authuc "backend/internal/usecase/auth"
	"backend/internal/usecase/property"
	reservationuc "backend/internal/usecase/reservation"
	useruc "backend/internal/usecase/user"
	"net/http"
)

type Dependencies struct {
	PropertyService    property.Service
	UserService        useruc.Service
	ReservationService reservationuc.Service
	AuthService        authuc.Service
	AEDService         aeduc.Service
}

func NewRouter(deps Dependencies) http.Handler {
	props := handler.NewPropertyHandler(deps.PropertyService, deps.AEDService)
	users := handler.NewUserHandler(deps.UserService)
	reservs := handler.NewReservationHandler(deps.ReservationService)
	dash := handler.NewDashboardHandler(deps.PropertyService, deps.UserService, deps.ReservationService)
	auth := handler.NewAuthHandler(deps.AuthService)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("GET /imoveis", props.List)
	mux.HandleFunc("GET /imoveis/usuario/{idUsuario}", props.ListByOwner)
	mux.HandleFunc("POST /imoveis", props.Create)
	mux.HandleFunc("GET /imoveis/{id}", props.GetByID)
	mux.HandleFunc("PUT /imoveis/{id}", props.Update)
	mux.HandleFunc("DELETE /imoveis/{id}", props.Delete)

	mux.HandleFunc("GET /usuarios", users.List)
	mux.HandleFunc("POST /usuarios", users.Create)
	mux.HandleFunc("GET /usuarios/anfitrioes", users.ListHosts)
	mux.HandleFunc("GET /usuarios/{id}", users.GetByID)
	mux.HandleFunc("PUT /usuarios/{id}", users.Update)
	mux.HandleFunc("DELETE /usuarios/{id}", users.Delete)

	mux.HandleFunc("GET /reservas", reservs.List)
	mux.HandleFunc("GET /reservas/hospede/{idHospede}", reservs.ListByGuest)
	mux.HandleFunc("GET /reservas/anfitriao/{idAnfitriao}", reservs.ListByHost)
	mux.HandleFunc("POST /reservas", reservs.Create)
	mux.HandleFunc("GET /reservas/{id}", reservs.GetByID)
	mux.HandleFunc("PUT /reservas/{id}", reservs.Update)
	mux.HandleFunc("PUT /reservas/{id}/confirmar", reservs.Confirm)
	mux.HandleFunc("DELETE /reservas/{id}", reservs.Delete)

	mux.HandleFunc("POST /auth/register", auth.Register)
	mux.HandleFunc("POST /auth/login", auth.Login)
	mux.HandleFunc("GET /auth/me", auth.Me)

	mux.HandleFunc("GET /dashboard/stats", dash.Stats)

	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
