package discord_administration

import (
	"fmt"
	"os"
	"strings"
	"bot/database"

	"github.com/bwmarrin/discordgo"
)

// toMathBold wandelt ASCII-Buchstaben in Unicode "Mathematical Bold" Zeichen um.
func toMathBold(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'A' && r <= 'Z':
			b.WriteRune(rune(0x1D400 + (r - 'A')))
		case r >= 'a' && r <= 'z':
			b.WriteRune(rune(0x1D41A + (r - 'a')))
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// HandleCreateTeamArea legt Rolle, Kategorie und Channels für ein Team an.
func HandleCreateTeamArea(s *discordgo.Session, i *discordgo.InteractionCreate) {
	guildID := i.GuildID
	adminRoleID := os.Getenv("PERM_CREATE_TEAM_ROLE_ID")
	hasPerm := false
	for _, r := range i.Member.Roles {
		if r == adminRoleID {
			hasPerm = true
			break
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
			Content: "Bereich wird erstellt … Einen kurzen Moment bitte",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 50, err, "Fehler beim Erstellen des Team-Bereichs")
	}

	// Optionen auslesen
	opts := i.ApplicationCommandData().Options
	game := strings.ToUpper(opts[0].StringValue())
	teamName := opts[1].StringValue()
	scrimm := opts[2].BoolValue()
	results := opts[3].BoolValue()
	orga := opts[4].BoolValue()
	notes := opts[5].BoolValue()

	// 1) Rolle erstellen
	name := fmt.Sprintf("%s %s", game, teamName)
	color := 0x53b4e2
	hoist := false
	mentionable := false
	roleParams := &discordgo.RoleParams{
		Name: name, 
		Color: &color, 
		Hoist: &hoist, 
		Mentionable: &mentionable,
	}
	teamRole, err := s.GuildRoleCreate(guildID, roleParams)
	if err != nil {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Fehler beim Erstellen der Rolle.", 
				Flags: discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	// 2) Kategorie erstellen
	rawName := fmt.Sprintf("%s | %s", game, strings.ToUpper(teamName))
	categoryName := toMathBold(rawName)
	perms := []*discordgo.PermissionOverwrite{
		{
			ID: teamRole.ID, 
			Type: discordgo.PermissionOverwriteTypeRole, 
			Allow: discordgo.PermissionViewChannel | discordgo.PermissionVoiceConnect,
		},
		{
			ID: guildID,
			Type: discordgo.PermissionOverwriteTypeRole,
			Deny: discordgo.PermissionViewChannel | discordgo.PermissionVoiceConnect,
		},
	}

	// Berechtigungen für den Kategorie erstellen
	envKey := fmt.Sprintf("PREDEFINED_KATPERM_ROLES_%s", game)
	if predef := os.Getenv(envKey); predef != "" {
		for _, rID := range strings.Split(predef, ",") {
			perms = append(perms, &discordgo.PermissionOverwrite{
				ID: rID, 
				Type: discordgo.PermissionOverwriteTypeRole, 
				Allow: discordgo.PermissionViewChannel,
			})
		}
	}
	category, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{
		Name: categoryName, 
		Type: discordgo.ChannelTypeGuildCategory, 
		PermissionOverwrites: perms,
	})

	if err != nil {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Fehler beim Erstellen der Kategorie.", 
				Flags: discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// 3) Text-Channels erstellen
	if _, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "💬・𝐓𝐞𝐚𝐦-𝐂𝐡𝐚𝐭", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 137, err, "Fehler beim Erstellen des Team-Chat-Kanals")
	}
	voiceChannel, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "🔊・𝐓𝐞𝐚𝐦-𝐕𝐨𝐢𝐜𝐞", Type: discordgo.ChannelTypeGuildVoice, ParentID: category.ID})
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 140, err, "Fehler beim Erstellen des Team-Voice-Kanals")
	}

	// Optionale Channels erstellen
	if scrimm {
		if _, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📆・𝐒𝐜𝐫𝐢𝐦𝐬", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 147, err, "Fehler beim Erstellen des Scrimm-Kanals")
		}
	}
	if results {
		if _, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "🏆・𝐄𝐫𝐠𝐞𝐛𝐧𝐢𝐬𝐬𝐞", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 152, err, "Fehler beim Erstellen des Results-Kanals")
		}
	}
	if orga {
		if _, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📌・𝐎𝐫𝐠𝐚𝐧𝐢𝐬𝐚𝐭𝐢𝐨𝐧", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 157, err, "Fehler beim Erstellen des Orga-Kanals")
		}
	}
	if notes {
		if _, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📬・𝐍𝐨𝐭𝐢𝐳𝐞𝐧", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 162, err, "Fehler beim Erstellen des Notes-Kanals")
		}
	}

	// 4) Speichern in DB
	if _, err := database.DB.Exec("INSERT INTO team_areas (team_name, game, role_id, category_id, voicechannel_id) VALUES (?, ?, ?, ?, ?)", teamName, game, teamRole.ID, category.ID, voiceChannel.ID); err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 168, err, "Fehler beim Speichern des Team-Bereichs in der Datenbank")
	}

	// 6) DM an Admin
	if adminDM := os.Getenv("ADMIN_DM_ID"); adminDM != "" {
		if dmC, err := s.UserChannelCreate(adminDM); err == nil {
			if _, err := s.ChannelMessageSend(dmC.ID, fmt.Sprintf("Neuer Team-Bereich '%s' für Spiel '%s' wurde erstellt.", teamName, game)); err != nil {
				LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 175, err, "Fehler beim Senden der Admin-DM")
			}
		}
	}

	// Antwort
	msg := fmt.Sprintf("Erfolgreich den Team-Bereich von **%s** für Spiel **%s** erstellt", teamName, game)
	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Content: &msg, 
	})
	if err != nil {
		LogAndNotifyAdmins(s, "Niedrig", "Error", "create_team_area.go", 187, err, "Fehler beim Bearbeiten der Interaktion")
		return
	}
}
