package discord_administration_utils

import (
	"bot/database"
	"bot/utils"
	"github.com/bwmarrin/discordgo"
)

// SetupRoleChangeHandler registriert den Role-Update Handler
func SetupRoleChangeHandler(bot *discordgo.Session) {
	bot.AddHandler(onRoleChange)
}

// onRoleChange - Event Handler für Rollenänderungen
func onRoleChange(bot *discordgo.Session, update *discordgo.GuildMemberUpdate) {
	if update.BeforeUpdate == nil {
		return
	}

	// Prüfen ob sich Rollen geändert haben
	oldRoles := make(map[string]bool)
	for _, role := range update.BeforeUpdate.Roles {
		oldRoles[role] = true
	}

	newRoles := make(map[string]bool)
	for _, role := range update.Roles {
		newRoles[role] = true
	}

	// User sicherstellen (wird in DB aufgenommen falls nicht vorhanden)
	userID, err := utils.EnsureUser(bot, update.User.ID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "role_update_handler.go", false, err,
			"Error ensuring user for role update: " + update.User.ID)
		return
	}
	if userID == 0 {
		return
	}

	// Alle Team-Rollen abrufen
	teamRoles := getTeamRoles()
	
	// Für jede Team-Rolle prüfen ob sich was geändert hat
	for teamID, roleID := range teamRoles {
		hadRole := oldRoles[roleID]
		hasRole := newRoles[roleID]
		
		// Rolle hinzugefügt -> User zu Team hinzufügen
		if !hadRole && hasRole {
			addUserToTeam(teamID, userID)
		}
		
		// Rolle entfernt -> User aus Team entfernen
		if hadRole && !hasRole {
			removeUserFromTeam(teamID, userID)
		}
	}
}

// getTeamRoles - Alle Team-IDs und ihre Role-IDs abrufen
func getTeamRoles() map[int]string {
	rows, err := database.DB.Query("SELECT id, role_id FROM team_areas WHERE is_active = '1'")
	if err != nil {
		return map[int]string{}
	}
	defer rows.Close()
	
	teamRoles := make(map[int]string)
	for rows.Next() {
		var teamID int
		var roleID string
		if rows.Scan(&teamID, &roleID) == nil {
			teamRoles[teamID] = roleID
		}
	}
	return teamRoles
}

// addUserToTeam - User zu Team hinzufügen
func addUserToTeam(teamID int, userID int) {
	database.DB.Exec(`
		INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP)
	`, teamID, userID)
}

// removeUserFromTeam - User aus Team entfernen
func removeUserFromTeam(teamID int, userID int) {
	database.DB.Exec(`
		DELETE FROM team_members 
		WHERE team_id = ? AND user_id = ?
	`, teamID, userID)
}