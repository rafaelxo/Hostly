package web

import (
	"net/http"

	"backend/internal/adapters/web/handler"
	"backend/internal/usecase/property"
	reservationuc "backend/internal/usecase/reservation"
	useruc "backend/internal/usecase/user"
)

type Dependencies struct {
	PropertyService    property.Service
	UserService        useruc.Service
	ReservationService reservationuc.Service
}

func NewRouter(deps Dependencies) http.Handler {
	props := handler.NewPropertyHandler(deps.PropertyService)
	users := handler.NewUserHandler(deps.UserService)
	reservs := handler.NewReservationHandler(deps.ReservationService)
	dash := handler.NewDashboardHandler(deps.PropertyService, deps.UserService, deps.ReservationService)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Imoveis Routes
	mux.HandleFunc("GET /imoveis", props.List)
	mux.HandleFunc("POST /imoveis", props.Create)
	mux.HandleFunc("GET /imoveis/{id}", props.GetByID)
	mux.HandleFunc("PUT /imoveis/{id}", props.Update)
	mux.HandleFunc("DELETE /imoveis/{id}", props.Delete)

	// Usuarios Routes
	mux.HandleFunc("GET /usuarios", users.List)
	mux.HandleFunc("POST /usuarios", users.Create)
	mux.HandleFunc("GET /usuarios/anfitrioes", users.ListHosts)
	mux.HandleFunc("GET /usuarios/{id}", users.GetByID)
	mux.HandleFunc("PUT /usuarios/{id}", users.Update)
	mux.HandleFunc("DELETE /usuarios/{id}", users.Delete)

	// Reservas Routes
	mux.HandleFunc("GET /reservas", reservs.List)
	mux.HandleFunc("POST /reservas", reservs.Create)
	mux.HandleFunc("GET /reservas/{id}", reservs.GetByID)
	mux.HandleFunc("PUT /reservas/{id}", reservs.Update)
	mux.HandleFunc("DELETE /reservas/{id}", reservs.Delete)

	// Dashboard Routes
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
