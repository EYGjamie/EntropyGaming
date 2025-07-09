package discord_administration_channel_voice

import (
	"database/sql"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

type VoiceVisibilityTracker struct {
	db       *sql.DB
	sessions map[string]string
}

func NewVoiceVisibilityTracker(db *sql.DB) *VoiceVisibilityTracker {
	return &VoiceVisibilityTracker{
		db:       db,
		sessions: make(map[string]string),
	}
}

func (vt *VoiceVisibilityTracker) OnVoiceStateUpdate(bot *discordgo.Session, bot_voiceState *discordgo.VoiceStateUpdate) {
	guildID := bot_voiceState.GuildID
	user := bot_voiceState.UserID
	oldChan := ""
	if ch, ok := vt.sessions[user]; ok {
		oldChan = ch
		delete(vt.sessions, user)
	}
	newChan := bot_voiceState.ChannelID
	if newChan != "" {
		vt.sessions[user] = newChan
	}

	rows, err := vt.db.Query(`SELECT voicechannel_id FROM team_areas WHERE is_active = 1`)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "voice_visibility.go", true, err, "Error getting team active voice channels")
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

	changed := map[string]struct{}{oldChan: {}, newChan: {}}

	for cid := range changed {
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

		if err := bot.ChannelPermissionSet(cid, guildID, discordgo.PermissionOverwriteTypeRole, allowPerms, denyPerms); err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "voice_visibility.go", false, err, "Fehler beim Setzen der Berechtigungen für Channel " + cid)
		}
	}
}