package discord_administration_team_areas

import (
	"fmt"
	"strings"
	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// toMathBold changes ASCII-Buchstaben into Unicode "Mathematical Bold"
func toMathBold(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'A' && r <= 'Z':
			b.WriteRune(rune(0x1D400 + (r - 'A')))
		case r >= 'a' && r <= 'z':
			b.WriteRune(rune(0x1D41A + (r - 'a')))
		case r >= '0' && r <= '9':
			b.WriteRune(rune(0x1D7CE + (r - '0')))
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// HandleCreateTeamArea creatses a team area, including its role, category, and channels.
// It checks if the user has the required permissions, responds to the interaction, and performs the creation.
func HandleCreateTeamArea(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	guildID := bot_interaction.GuildID
	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Bereich wird erstellt … Einen kurzen Moment bitte",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", false, err, "Error senden response for create team area")
	}

	// Optionen auslesen
	opts := bot_interaction.ApplicationCommandData().Options
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
	mentionable := true
	roleParams := &discordgo.RoleParams{
		Name: name, 
		Color: &color, 
		Hoist: &hoist, 
		Mentionable: &mentionable,
	}
	teamRole, err := bot.GuildRoleCreate(guildID, roleParams)
	if err != nil {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
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

	// => DBMIGRATION
	envKey := fmt.Sprintf("PREDEFINED_KATPERM_ROLES_%s", game)
	if predef := utils.GetIdFromDB(bot, envKey); predef != "" { // => DBMIGRATION
		for _, rID := range strings.Split(predef, ",") {
			perms = append(perms, &discordgo.PermissionOverwrite{
				ID: rID, 
				Type: discordgo.PermissionOverwriteTypeRole, 
				Allow: discordgo.PermissionViewChannel,
			})
		}
	}
	category, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{
		Name: categoryName, 
		Type: discordgo.ChannelTypeGuildCategory, 
		PermissionOverwrites: perms,
	})

	if err != nil {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Fehler beim Erstellen der Kategorie.", 
				Flags: discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// 3) Text-Channels erstellen
	if _, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "💬・𝐓𝐞𝐚𝐦-𝐂𝐡𝐚𝐭", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error create team text channel")
	}
	voiceChannel, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "🔊・𝐓𝐞𝐚𝐦-𝐕𝐨𝐢𝐜𝐞", Type: discordgo.ChannelTypeGuildVoice, ParentID: category.ID})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error creating team voice channel")
	}

	// Optionale Channels erstellen
	if scrimm {
		if _, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📆・𝐒𝐜𝐫𝐢𝐦𝐬", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error creating scrimm channel")
		}
	}
	if results {
		if _, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "🏆・𝐄𝐫𝐠𝐞𝐛𝐧𝐢𝐬𝐬𝐞", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error creating results channel")
		}
	}
	if orga {
		if _, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📌・𝐎𝐫𝐠𝐚𝐧𝐢𝐬𝐚𝐭𝐢𝐨𝐧", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error creating organization channel")
		}
	}
	if notes {
		if _, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{Name: "📬・𝐍𝐨𝐭𝐢𝐳𝐞𝐧", Type: discordgo.ChannelTypeGuildText, ParentID: category.ID}); err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error creating notes channel")
		}
	}

	// 4) Speichern in DB
	if _, err := database.DB.Exec("INSERT INTO team_areas (team_name, game, role_id, category_id, voicechannel_id) VALUES (?, ?, ?, ?, ?)", teamName, game, teamRole.ID, category.ID, voiceChannel.ID); err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", true, err, "Error saving team area to DB")
	}

	// 5) DM an Admin
	utils.LogAndNotifyAdmins(bot, "info", "Info", "create_team_area.go", true, nil, fmt.Sprintf("Team-Area created for **%s** (%s). RoleID: %s, CategoryID: %s, VoiceID: %s", teamName, game, teamRole.ID, category.ID, voiceChannel.ID))

	// Antwort
	msg := fmt.Sprintf("Erfolgreich den Team-Bereich von **%s** für Spiel **%s** erstellt", teamName, game)
	_, err = bot.InteractionResponseEdit(bot_interaction.Interaction, &discordgo.WebhookEdit{
		Content: &msg, 
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_team_area.go", false, err, "Error editing interaction response")
		return
	}
}
