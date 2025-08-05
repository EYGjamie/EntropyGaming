// bot/api/team_handler.go
package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"fmt"

	"bot/database"
	"bot/utils"
	
	"github.com/bwmarrin/discordgo"
	"github.com/gorilla/mux"
)

type TeamChangeNameRequest struct {
	Name string `json:"name"`
}

// handleDeleteTeamMember - DELETE /api/teams/member/delete/{user_id}
func (api *APIServer) handleDeleteTeamMember(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["user_id"]
	teamID := r.URL.Query().Get("team_id")

	if userID == "" || teamID == "" {
		http.Error(w, "user_id und team_id sind erforderlich", http.StatusBadRequest)
		return
	}

	// 1. Discord ID des Users aus DB holen
	var discordID string
	err := database.DB.QueryRow("SELECT discord_id FROM users WHERE id = ?", userID).Scan(&discordID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error getting discord_id for user_id: "+userID)
		http.Error(w, "User nicht gefunden", http.StatusNotFound)
		return
	}

	// 2. Team-Rolle ID aus team_areas holen
	var teamRoleID string
	err = database.DB.QueryRow("SELECT role_id FROM team_areas WHERE id = ? AND is_active = 1", teamID).Scan(&teamRoleID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error getting team role for team_id: "+teamID)
		http.Error(w, "Team nicht gefunden", http.StatusNotFound)
		return
	}

	// 3. Team-Rolle entfernen
	err = api.bot.GuildMemberRoleRemove(api.guildID, discordID, teamRoleID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error removing team role from user: "+discordID)
		http.Error(w, "Fehler beim Entfernen der Team-Rolle", http.StatusInternalServerError)
		return
	}

	// 4. Diamond Teams Rolle entfernen
	diamondTeamsRole := utils.GetIdFromDB(api.bot, "ROLE_DIAMOND_TEAMS")
	if diamondTeamsRole != "" {
		err = api.bot.GuildMemberRoleRemove(api.guildID, discordID, diamondTeamsRole)
		if err != nil {
			utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error removing diamond teams role from user: "+discordID)
			// Nicht als kritischer Fehler behandeln - weiter fortfahren
		}
	}

	// 5. Aus team_members Tabelle entfernen
	_, err = database.DB.Exec("DELETE FROM team_members WHERE team_id = ? AND user_id = ?", teamID, userID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error removing user from team_members table")
		// Weiter fortfahren, da Discord-Aktionen bereits erfolgreich waren
	}

	utils.LogAndNotifyAdmins(api.bot, "info", "Info", "team_handler.go", false, nil, fmt.Sprintf("User %s wurde aus Team %s entfernt", discordID, teamID))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Mitglied erfolgreich aus Team entfernt",
	})
}

// toMathBold ändert ASCII-Buchstaben in Unicode "Mathematical Bold"
func toMathBold(s string) string {
	var builder strings.Builder
	for _, r := range s {
		switch {
		case r >= 'A' && r <= 'Z':
			builder.WriteRune(rune(0x1D400 + (r - 'A')))
		case r >= 'a' && r <= 'z':
			builder.WriteRune(rune(0x1D41A + (r - 'a')))
		case r >= '0' && r <= '9':
			builder.WriteRune(rune(0x1D7CE + (r - '0')))
		default:
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

// handleChangeTeamName - POST /api/teams/name/change/{team_id}
func (api *APIServer) handleChangeTeamName(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	teamID := vars["team_id"]

	if teamID == "" {
		http.Error(w, "team_id ist erforderlich", http.StatusBadRequest)
		return
	}

	var req TeamChangeNameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ungültiger JSON Body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name ist erforderlich", http.StatusBadRequest)
		return
	}

	// 1. Team-Daten aus DB holen
	var currentName, game, roleID, categoryID string
	err := database.DB.QueryRow(
		"SELECT team_name, game, role_id, category_id FROM team_areas WHERE id = ? AND is_active = 1", 
		teamID,
	).Scan(&currentName, &game, &roleID, &categoryID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error getting team data for team_id: "+teamID)
		http.Error(w, "Team nicht gefunden", http.StatusNotFound)
		return
	}

	// 2. Rolle in Discord aktualisieren (behält Game Prefix)
	newRoleName := fmt.Sprintf("%s %s", game, req.Name)
	_, err = api.bot.GuildRoleEdit(api.guildID, roleID, &discordgo.RoleParams{
		Name: newRoleName,
	})
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error updating role name: "+roleID)
		http.Error(w, "Fehler beim Aktualisieren der Rolle", http.StatusInternalServerError)
		return
	}

	// 3. Kategorie in Discord aktualisieren (mit Math Bold Font)
	rawCategoryName := fmt.Sprintf("%s | %s", game, strings.ToUpper(req.Name))
	newCategoryName := toMathBold(rawCategoryName)
	_, err = api.bot.ChannelEdit(categoryID, &discordgo.ChannelEdit{
		Name: newCategoryName,
	})
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error updating category name: "+categoryID)
		http.Error(w, "Fehler beim Aktualisieren der Kategorie", http.StatusInternalServerError)
		return
	}

	// 4. Team-Name in DB aktualisieren
	_, err = database.DB.Exec("UPDATE team_areas SET team_name = ? WHERE id = ?", req.Name, teamID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error updating team name in database")
		http.Error(w, "Fehler beim Aktualisieren in der Datenbank", http.StatusInternalServerError)
		return
	}

	utils.LogAndNotifyAdmins(api.bot, "info", "Info", "team_handler.go", false, nil, fmt.Sprintf("Team %s wurde zu %s umbenannt", currentName, req.Name))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Team-Name erfolgreich geändert",
		"old_name": currentName,
		"new_name": req.Name,
	})
}

// handleDeleteTeam - DELETE /api/teams/delete/{category_id}
func (api *APIServer) handleDeleteTeam(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	categoryID := vars["category_id"]

	if categoryID == "" {
		http.Error(w, "category_id ist erforderlich", http.StatusBadRequest)
		return
	}

	// Verwende die bestehende delete_team_area.go Logik
	err := api.deleteTeamAreaLogic(categoryID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error deleting team area: "+categoryID)
		http.Error(w, "Fehler beim Löschen des Teams: "+err.Error(), http.StatusInternalServerError)
		return
	}

	utils.LogAndNotifyAdmins(api.bot, "info", "Info", "team_handler.go", false, nil, fmt.Sprintf("Team-Bereich %s wurde über API gelöscht", categoryID))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"message": "Team erfolgreich gelöscht",
		"category_id": categoryID,
	})
}

// deleteTeamAreaLogic - Implementiert die Logik aus delete_team_area.go
func (api *APIServer) deleteTeamAreaLogic(catID string) error {
	guildID := api.guildID

	// 1. Alle Channels der Kategorie holen
	chs, err := api.bot.GuildChannels(guildID)
	if err != nil {
		return fmt.Errorf("fehler beim Abrufen der Channels: %v", err)
	}

	var textCh, voiceCh []*discordgo.Channel
	for _, ch := range chs {
		if ch.ParentID == catID {
			switch ch.Type {
			case discordgo.ChannelTypeGuildText:
				textCh = append(textCh, ch)
			case discordgo.ChannelTypeGuildVoice:
				voiceCh = append(voiceCh, ch)
			}
		}
	}

	// 2. Team Rolle aus DB abfragen
	var teamRoleID string
	err = database.DB.QueryRow("SELECT role_id FROM team_areas WHERE category_id = ?", catID).Scan(&teamRoleID)
	if err != nil {
		return fmt.Errorf("fehler beim Abrufen der Team-Rolle: %v", err)
	}

	// 3. Diamond Teams Rolle von allen Team-Mitgliedern entfernen
	diamondTeamsRole := utils.GetIdFromDB(api.bot, "ROLE_DIAMOND_TEAMS")
	if diamondTeamsRole != "" {
		var after string
		for {
			members, err := api.bot.GuildMembers(guildID, after, 1000)
			if err != nil {
				utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", false, err, "Error fetching guild members")
				break
			}
			if len(members) == 0 {
				break
			}

			for _, m := range members {
				hasTeamRole := false
				for _, r := range m.Roles {
					if r == teamRoleID {
						hasTeamRole = true
						break
					}
				}
				if hasTeamRole {
					for _, r := range m.Roles {
						if r == diamondTeamsRole {
							api.bot.GuildMemberRoleRemove(guildID, m.User.ID, diamondTeamsRole)
							break
						}
					}
				}
			}
			after = members[len(members)-1].User.ID
		}
	}

	// 4. Rolle löschen
	if teamRoleID != "" {
		err = api.bot.GuildRoleDelete(guildID, teamRoleID)
		if err != nil {
			utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, "Error deleting team role")
		}
	}

	// 5. Alle Channels löschen
	for _, ch := range append(textCh, voiceCh...) {
		_, err = api.bot.ChannelDelete(ch.ID)
		if err != nil {
			utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, fmt.Sprintf("Error deleting Channel: %s", ch.ID))
		}
	}

	// 6. Kategorie löschen
	_, err = api.bot.ChannelDelete(catID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, fmt.Sprintf("Error deleting category %s", catID))
	}

	// 7. DB-Eintrag deaktivieren
	_, err = database.DB.Exec("UPDATE team_areas SET is_active = 0 WHERE category_id = ?", catID)
	if err != nil {
		utils.LogAndNotifyAdmins(api.bot, "low", "Error", "team_handler.go", true, err, fmt.Sprintf("Error updating team db entry %s", catID))
	}

	return nil
}