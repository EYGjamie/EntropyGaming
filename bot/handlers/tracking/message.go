package tracking

import (
	"database/sql"
	"log"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// MessageTracker verwaltet das Tracking von Chat-Nachrichten
// Es speichert aggregiert die Anzahl und im Log nur User und Zeit
type MessageTracker struct {
	db *sql.DB
}

// NewMessageTracker erstellt eine neue Instanz des MessageTracker
func NewMessageTracker(db *sql.DB) *MessageTracker {
	return &MessageTracker{db: db}
}

// OnMessageCreate wird bei jedem MessageCreate-Event aufgerufen
// und aktualisiert den aggregierten Zähler sowie das vereinfachte Log
func (mt *MessageTracker) OnMessageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Bot-Nachrichten ignorieren
	if m.Author.Bot {
		return
	}

	// Stelle sicher, dass der User existiert
	userID, err := utils.EnsureUser(mt.db, m.Author.ID, m.Author.Username)
	if err != nil {
		log.Printf("Fehler beim EnsureUser für MessageAuthor %s: %v", m.Author.ID, err)
		return
	}

	// Aktualisiere aggregierten Nachrichten-Zähler
	_, err = mt.db.Exec(
		`INSERT INTO message_counts (user_id, message_count) VALUES ($1, 1)
		 ON CONFLICT (user_id) DO UPDATE SET message_count = message_counts.message_count + 1`,
		userID,
	)
	if err != nil {
		log.Printf("Fehler beim Updaten der message_counts für User %d: %v", userID, err)
	}

	// Logge Zeitstempel der Nachricht ohne Channel- und Message-ID
	_, err = mt.db.Exec(
		`INSERT INTO log_messages (user_id, created_at)
		 VALUES ($1, $2)`,
		userID, time.Now(),
	)
	if err != nil {
		log.Printf("Fehler beim Schreiben des log_messages-Eintrags für User %d: %v", userID, err)
	}
}

// RegisterMessageTracker registriert den MessageTracker als Event-Handler auf der Session
func (mt *MessageTracker) RegisterMessageTracker(s *discordgo.Session) {
	s.AddHandler(mt.OnMessageCreate)
}
