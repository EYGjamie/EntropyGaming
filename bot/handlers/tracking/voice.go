package tracking

import (
	"database/sql"
	"log"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// voiceSession speichert für jeden User, in welchem Channel er seit wann ist
type voiceSession struct {
	channelID string
	joinedAt  time.Time
}

// VoiceTracker verwaltet das Tracking der Voice-Zeiten
type VoiceTracker struct {
	db       *sql.DB
	sessions map[string]voiceSession // key: UserID
}

// NewVoiceTracker instanziiert den Tracker
func NewVoiceTracker(db *sql.DB) *VoiceTracker {
	return &VoiceTracker{
		db:       db,
		sessions: make(map[string]voiceSession),
	}
}

// OnVoiceStateUpdate reagiert auf jeden VoiceStateChange
func (vt *VoiceTracker) OnVoiceStateUpdate(s *discordgo.Session, vs *discordgo.VoiceStateUpdate) {
	userID := vs.UserID
	internalID, err := utils.EnsureUser(s, userID)
	if err != nil {
		log.Printf("Fehler beim EnsureUser für Voice User %s: %v", userID, err)
		return
	}

	oldChannel := ""
	if sess, ok := vt.sessions[userID]; ok {
		oldChannel = sess.channelID
	}
	newChannel := vs.VoiceState.ChannelID

	// 1) User joint einem Channel
	if oldChannel == "" && newChannel != "" {
		vt.sessions[userID] = voiceSession{channelID: newChannel, joinedAt: time.Now()}
		return
	}

	// 2) User verlässt einen Channel
	if oldChannel != "" && newChannel == "" {
		sess := vt.sessions[userID]
		leftAt := time.Now()
		duration := int(leftAt.Sub(sess.joinedAt).Seconds())

		_, err := vt.db.Exec(
			`INSERT INTO log_voice (user_id, channel_id, joined_at, left_at, duration) VALUES ($1, $2, $3, $4, $5)`,
			internalID, sess.channelID, sess.joinedAt, leftAt, duration,
		)
		if err != nil {
			log.Printf("Fehler beim Schreiben des Voice-Logs: %v", err)
		}

		delete(vt.sessions, userID)
		return
	}

	// 3) Channel-Wechsel
	if oldChannel != "" && newChannel != "" && oldChannel != newChannel {
		sess := vt.sessions[userID]
		leftAt := time.Now()
		duration := int(leftAt.Sub(sess.joinedAt).Seconds())

		_, err := vt.db.Exec(
			`INSERT INTO log_voice (user_id, channel_id, joined_at, left_at, duration) VALUES ($1, $2, $3, $4, $5)`,
			internalID, sess.channelID, sess.joinedAt, leftAt, duration,
		)
		if err != nil {
			log.Printf("Fehler beim Schreiben des Voice-Log-Wechsels: %v", err)
		}
		vt.sessions[userID] = voiceSession{channelID: newChannel, joinedAt: time.Now()}
	}
}