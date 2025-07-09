package tracking

import (
	"database/sql"
	"log"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// InviteTracker verwaltet das Invite-Tracking
type InviteTracker struct {
	db         *sql.DB
	inviteUses map[string]int
}

// NewInviteTracker erstellt eine neue Instanz des InviteTracker
func NewInviteTracker(db *sql.DB) *InviteTracker {
	return &InviteTracker{
		db:         db,
		inviteUses: make(map[string]int),
	}
}

// UpdateInvites aktualisiert den Invite-Cache für einen Server
func (it *InviteTracker) UpdateInvites(s *discordgo.Session, guildID string) {
	invites, err := s.GuildInvites(guildID)
	if err != nil {
		log.Printf("Fehler beim Laden der Invites für Guild %s: %v", guildID, err)
		return
	}

	for _, inv := range invites {
		it.inviteUses[inv.Code] = inv.Uses
	}
}

// OnReady initialisiert beim Bot-Start alle Invite-Counts
func (it *InviteTracker) OnReady(s *discordgo.Session, event *discordgo.Ready) {
	for _, g := range event.Guilds {
		it.UpdateInvites(s, g.ID)
	}
}

// OnGuildMemberAdd erkennt den genutzten Invite und loggt ihn in der Datenbank
func (it *InviteTracker) OnGuildMemberAdd(s *discordgo.Session, m *discordgo.GuildMemberAdd) {
	// Ensure Users exist
	joinerID, err := utils.EnsureUser(it.db, m.User.ID, m.User.Username)
	if err != nil {
		log.Printf("Fehler beim EnsureUser für Joiner %s: %v", m.User.ID, err)
		return
	}

	invites, err := s.GuildInvites(m.GuildID)
	if err != nil {
		log.Printf("Fehler beim Laden der Invites für Guild %s: %v", m.GuildID, err)
		return
	}

	var usedCode string
	var inviterDiscordID string
	var inviterUsername string
	for _, inv := range invites {
		prevUses, known := it.inviteUses[inv.Code]
		if !known {
			it.inviteUses[inv.Code] = inv.Uses
			continue
		}
		if inv.Uses > prevUses {
			usedCode = inv.Code
			inviterDiscordID = inv.Inviter.ID
			inviterUsername = inv.Inviter.Username
			it.inviteUses[inv.Code] = inv.Uses
			break
		}
	}

	// Optional: wenn kein Invite erkannt, abbrechen
	if usedCode == "" {
		return
	}

	inviterID, err := utils.EnsureUser(it.db, inviterDiscordID, inviterUsername)
	if err != nil {
		log.Printf("Fehler beim EnsureUser für Inviter %s: %v", inviterDiscordID, err)
	}

	// Log-Eintrag in die Datenbank
	_, err = it.db.Exec(
		`INSERT INTO log_joins (inviter, invite_code, joiner, joined_at) VALUES (?, ?, ?, ?)`,
		inviterID, usedCode, joinerID, time.Now(),
	)
	if err != nil {
		log.Printf("Fehler beim Schreiben des Joins in die DB: %v", err)
	}
}