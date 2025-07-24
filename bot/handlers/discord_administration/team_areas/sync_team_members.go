package discord_administration_team_areas

import (
	"fmt"
	"time"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

// StartWeeklySync startet den wöchentlichen Sync-Job (Montag 4:00 Uhr)
func StartWeeklySync(bot *discordgo.Session) {
	c := cron.New()
	c.AddFunc("0 4 * * 1", func() {
		guildID := utils.GetIdFromDB(bot, "GUILD_ID")
		if guildID != "" {
			utils.LogAndNotifyAdmins(bot, "info", "Info", "sync_team_members.go", false, nil, "Starte wöchentlichen Team-Sync")
			syncAllTeams(bot, guildID)
		}
	})
	c.Start()
}

// HandleSyncTeamMembers - Manueller Sync per Slash Command
func HandleSyncTeamMembers(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Synchronisiere Team-Mitglieder …",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "sync_team_members.go", false, err, "Error response")
		return
	}

	synced, removed := syncAllTeams(bot, utils.GetIdFromDB(bot, "GUILD_ID"))

	msg := fmt.Sprintf("✅ Sync abgeschlossen\n📊 Hinzugefügt: %d | Entfernt: %d", synced, removed)
	bot.InteractionResponseEdit(bot_interaction.Interaction, &discordgo.WebhookEdit{
		Content: &msg,
	})
}

// syncAllTeams - Hauptfunktion für den Sync aller Teams
func syncAllTeams(bot *discordgo.Session, guildID string) (synced int, removed int) {
	rows, err := database.DB.Query("SELECT id, role_id, team_name FROM team_areas WHERE is_active = '1'")
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "sync_team_members.go", true, err, "Error getting teams")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var teamID int
		var roleID, teamName string
		if err := rows.Scan(&teamID, &roleID, &teamName); err != nil {
			continue
		}

		s, r := syncSingleTeam(bot, guildID, teamID, roleID, teamName)
		synced += s
		removed += r
	}

	utils.LogAndNotifyAdmins(bot, "info", "Info", "sync_team_members.go", false, nil, 
		fmt.Sprintf("Team-Sync: %d hinzugefügt, %d entfernt", synced, removed))
	
	return synced, removed
}

// syncSingleTeam - Synchronisiert ein einzelnes Team
func syncSingleTeam(bot *discordgo.Session, guildID string, teamID int, roleID, teamName string) (synced int, removed int) {
	currentMembers := getCurrentMembers(teamID)
	discordMembers := getDiscordMembersWithRole(bot, guildID, roleID)
	currentSet := make(map[string]bool)
	for _, member := range currentMembers {
		currentSet[member] = true
	}
	
	discordSet := make(map[string]bool)
	for _, member := range discordMembers {
		discordSet[member] = true
	}
	
	// Hinzufügen neuer Mitglieder
	for discordID := range discordSet {
		if !currentSet[discordID] {
			if addTeamMember(bot, teamID, discordID) {
				synced++
			}
		}
	}
	
	// Entfernen alter Mitglieder
	for discordID := range currentSet {
		if !discordSet[discordID] {
			if removeTeamMember(teamID, discordID) {
				removed++
			}
		}
	}
	
	return synced, removed
}

// getCurrentMembers - Aktuelle Team-Mitglieder aus DB
func getCurrentMembers(teamID int) []string {
	rows, err := database.DB.Query(`
		SELECT u.discord_id FROM team_members tm
		JOIN users u ON tm.user_id = u.id
		WHERE tm.team_id = ?
	`, teamID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	
	var members []string
	for rows.Next() {
		var discordID string
		if rows.Scan(&discordID) == nil {
			members = append(members, discordID)
		}
	}
	return members
}

// getDiscordMembersWithRole - Discord-Mitglieder mit Rolle (mit Pagination)
func getDiscordMembersWithRole(bot *discordgo.Session, guildID, roleID string) []string {
	var members []string
	var after string
	
	for {
		guildMembers, err := bot.GuildMembers(guildID, after, 1000)
		if err != nil || len(guildMembers) == 0 {
			break
		}
		
		for _, member := range guildMembers {
			for _, role := range member.Roles {
				if role == roleID {
					members = append(members, member.User.ID)
					break
				}
			}
		}
		
		after = guildMembers[len(guildMembers)-1].User.ID
	}
	
	return members
}

// Fügt einen User in die team_members-Tabelle ein
func addTeamMember(bot *discordgo.Session, teamID int, discordID string) bool {
	userID, err := utils.EnsureUser(bot, discordID)

	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "sync_team_members.go", true, err, 
			fmt.Sprintf("Fehler beim Hinzufügen von %s zum Team %d", discordID, teamID))
		return false
	}

	if userID == 0 {
		return false
	}
	
	_, err = database.DB.Exec(`
		INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at) 
		VALUES (?, ?, ?)
	`, teamID, userID, time.Now())
	
	return err == nil
}

func removeTeamMember(teamID int, discordID string) bool {
	_, err := database.DB.Exec(`
		DELETE FROM team_members WHERE team_id = ? AND user_id = (
			SELECT id FROM users WHERE discord_id = ?
		)
	`, teamID, discordID)
	
	return err == nil
}