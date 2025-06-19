package tracking

import (
	"database/sql"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
)

// LeaveTracker verwaltet das Tracking von Member-Entfernungen
type LeaveTracker struct {
	db *sql.DB
}

// NewLeaveTracker erstellt eine neue Instanz des LeaveTracker
func NewLeaveTracker(db *sql.DB) *LeaveTracker {
	return &LeaveTracker{db: db}
}

// OnGuildMemberRemove wird bei GuildMemberRemove-Events aufgerufen
// und schreibt den Leave in die Datenbank-Tabelle log_leaves
func (lt *LeaveTracker) OnGuildMemberRemove(s *discordgo.Session, m *discordgo.GuildMemberRemove) {
	leaverID, err := EnsureUser(lt.db, m.User.ID, m.User.Username)
	if err != nil {
		log.Printf("Fehler beim EnsureUser für Leaver %s: %v", m.User.ID, err)
		return
	}

	_, err = lt.db.Exec(
		`INSERT INTO log_leaves (leaver, left_at) VALUES ($1, $2)`,
		leaverID, time.Now(),
	)
	if err != nil {
		log.Printf("Fehler beim Schreiben des Leaves in die DB: %v", err)
	}
}