package discord_administration_channel_voice

import (
	"database/sql"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// VoiceVisibilityTracker macht Team-Voice-Channels nur sichtbar, wenn sie belegt sind.
type VoiceVisibilityTracker struct {
	db       *sql.DB
	sessions map[string]string
}

// NewVoiceVisibilityTracker instanziiert den Tracker.
func NewVoiceVisibilityTracker(db *sql.DB) *VoiceVisibilityTracker {
	return &VoiceVisibilityTracker{
		db:       db,
		sessions: make(map[string]string),
	}
}

// OnVoiceStateUpdate feuert bei jedem VoiceState-Wechsel.
func (vt *VoiceVisibilityTracker) OnVoiceStateUpdate(s *discordgo.Session, vs *discordgo.VoiceStateUpdate) {
	guildID := vs.GuildID

	// Update vt.sessions: entfernen alter Eintrag, setzen neuer
	user := vs.UserID
	oldChan := ""
	if ch, ok := vt.sessions[user]; ok {
		oldChan = ch
		delete(vt.sessions, user)
	}
	newChan := vs.ChannelID
	if newChan != "" {
		vt.sessions[user] = newChan
	}

	// Lade alle Team-Voice-Channel-IDs
	rows, err := vt.db.Query(`SELECT voicechannel_id FROM team_areas WHERE is_active = 1`)
	if err != nil {
		utils.LogAndNotifyAdmins(s, "Hoch", "Error", "voice_visibility.go", 0, err, "Fehler beim Abfragen der Team-Voice-Channels")
		return
	}
	defer rows.Close()

	var channelIDs []string
	for rows.Next() {
		var cid string
		if err := rows.Scan(&cid); err != nil {
			continue
		}
		channelIDs = append(channelIDs, cid)
	}

	// Wir prüfen nur Kanäle, die sich geändert haben
	changed := map[string]struct{}{oldChan: {}, newChan: {}}

	for cid := range changed {
		// Nur Team-Channels
		found := false
		for _, tc := range channelIDs {
			if tc == cid {
				found = true
				break
			}
		}
		if !found || cid == "" {
			continue
		}

		// Zähle aktuelle Sessions in diesem Channel
		count := 0
		for _, ch := range vt.sessions {
			if ch == cid {
				count++
			}
		}

		var allowPerms, denyPerms int64
		if count > 0 {
			allowPerms = discordgo.PermissionViewChannel
			denyPerms = discordgo.PermissionVoiceConnect
		} else {
			allowPerms = 0
			denyPerms = discordgo.PermissionViewChannel | discordgo.PermissionVoiceConnect
		}

		// Overwrite für @everyone (ID = guildID)
		if err := s.ChannelPermissionSet(cid, guildID, discordgo.PermissionOverwriteTypeRole, allowPerms, denyPerms); err != nil {
			utils.LogAndNotifyAdmins(s, "Niedrig", "Error", "voice_visibility.go", 0, err, "Fehler beim Setzen der Berechtigungen für Channel "+cid)
		}
	}
}