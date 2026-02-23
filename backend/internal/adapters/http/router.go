package handler

import (
	"net/http"
)

func NewRouter(deps Dependencies) http.Handler {
	h := NewHandler(deps)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/imoveis", h.HandleProperties)
	mux.HandleFunc("/imoveis/", h.HandlePropertyByID)
	mux.HandleFunc("/usuarios", h.HandleUsers)
	mux.HandleFunc("/usuarios/", h.HandleUserByID)
	mux.HandleFunc("/usuarios/anfitrioes", h.HandleUsersHosts)
	mux.HandleFunc("/reservas", h.HandleReservations)
	mux.HandleFunc("/reservas/", h.HandleReservationByID)
	mux.HandleFunc("/dashboard/stats", h.HandleDashboardStats)

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


