// bot/api/http_handler.go
package api

import (
	"encoding/json"
	"net/http"
	"os"
	"log"
	statsService "bot/services/stats"

	"github.com/bwmarrin/discordgo"
	"github.com/gorilla/mux"
)

type APIServer struct {
	statsService *statsService.StatsService
	bot          *discordgo.Session  // Bot-Session direkt hinzufügen
	guildID      string
}

func NewAPIServer(bot *discordgo.Session, guildID string) *APIServer {
	return &APIServer{
		statsService: statsService.NewStatsService(bot),
		bot:          bot,  // Bot-Session speichern
		guildID:      guildID,
	}
}

// StartAPI - Startet den HTTP Server
func (api *APIServer) StartAPI() {
	r := mux.NewRouter()
	
	// CORS Middleware
	r.Use(corsMiddleware)
	
	// Existing API Routes
	r.HandleFunc("/api/stats", api.handleStats).Methods("GET")
	r.HandleFunc("/api/health", api.handleHealth).Methods("GET")
	
	// New Team Management API Routes
	r.HandleFunc("/api/teams/member/delete/{user_id}", api.handleDeleteTeamMember).Methods("DELETE")
	r.HandleFunc("/api/teams/name/change/{team_id}", api.handleChangeTeamName).Methods("POST")
	r.HandleFunc("/api/teams/delete/{category_id}", api.handleDeleteTeam).Methods("DELETE")
	
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("API Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// handleStats - HTTP Stats Endpoint (nutzt denselben Service!)
func (api *APIServer) handleStats(w http.ResponseWriter, r *http.Request) {
	// Query Parameter parsen
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	
	// Zeitraum parsen (gleiche Logik wie Discord Command)
	fromDate, toDate := api.statsService.ParseTimeRange(fromStr, toStr)
	
	// Stats abrufen (zentrale Service-Logik)
	stats, err := api.statsService.GetServerStats(api.guildID, fromDate, toDate)
	if err != nil {
		http.Error(w, "Fehler beim Abrufen der Statistiken: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// JSON Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (api *APIServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"service": "discord-bot-stats-api",
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}