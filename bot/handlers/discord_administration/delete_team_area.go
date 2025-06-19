package discord_administration

import (
	"fmt"
	"os"

	"github.com/bwmarrin/discordgo"
	"bot/database"
)

// HandleDeleteTeamArea löscht einen Team-Bereich vollständig
func HandleDeleteTeamArea(s *discordgo.Session, i *discordgo.InteractionCreate) {
	guildID := i.GuildID
	permRole := os.Getenv("PERM_DELETE_TEAM_ROLE_ID")
	hasPerm := false
	for _, r := range i.Member.Roles {
		if r == permRole {
			hasPerm = true
		}
	}
	if !hasPerm {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Du hast keine Berechtigung.", 
				Flags: discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Bereich wird gelöscht … Einen kurzen Moment bitte",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 40, err, "Fehler beim Löschen des Team-Bereichs")
		return
	}

	catID := i.ApplicationCommandData().Options[0].StringValue()
	chs, err := s.GuildChannels(guildID)
	if err != nil {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Es wurden keine Channel für die Kategorie gefunden.", 
				Flags: discordgo.MessageFlagsEphemeral,
			},
		})
		return
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
	
	// Team Rolle aus DB abfragen
	var TeamRoleID string
	database.DB.QueryRow(
		"SELECT role_id FROM team_areas WHERE category_id = ?", catID,
	).Scan(&TeamRoleID)

	// Diamond Teams Rolle entfernen wenn User Team Rolle hat
	DiamondTeamsRole := os.Getenv("ROLE_DIAMOND_TEAMS")
	var after string
	for {
		members, err := s.GuildMembers(guildID, after, 1000)
		if err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 80, err, "Fehler beim Abfragen der Mitglieder")
			break
		}
		if len(members) == 0 {
			break
		}

		for _, m := range members {
			hasTeamRole := false
			for _, r := range m.Roles {
				if r == TeamRoleID {
					hasTeamRole = true
					break
				}
			}
			if hasTeamRole {
				for _, r := range m.Roles {
					if r == DiamondTeamsRole {
						s.GuildMemberRoleRemove(guildID, m.User.ID, DiamondTeamsRole)
						break
					}
				}
			}
		}
		after = members[len(members)-1].User.ID
	}

	// Rolle löschen
	if TeamRoleID != "" {
		err = s.GuildRoleDelete(guildID, TeamRoleID)
		if err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 111, err, "Fehler beim Löschen der Team Rolle")
		}
	}

	for _, ch := range append(textCh, voiceCh...) {
		_, err = s.ChannelDelete(ch.ID)
		if err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 118, err, fmt.Sprintf("Fehler beim Löschen des Channels %s", ch.ID))
		}
	}

	_, err = s.ChannelDelete(catID)
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 124, err, fmt.Sprintf("Fehler beim Löschen der Kategorie %s", catID))
	}

	// DB-Eintrag deaktivieren
	_, err = database.DB.Exec(
		"UPDATE team_areas SET is_active = false WHERE category_id = ?", catID,
	)
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 132, err, fmt.Sprintf("Fehler beim Deaktivieren des DB-Eintrags für Kategorie %s", catID))
	}

	// Nutzer über erfolgreiches löschen informieren
	msg := fmt.Sprintf("Team-Bereich %s wurde gelöscht.", catID)
	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Content: &msg,
	})
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "delete_team_area.go", 141, err, "Fehler beim Bearbeiten der Interaktion")
	}
}
