package pb_gen

import (
	"bot/utils"
	"fmt"

	"github.com/bwmarrin/discordgo"
)

// HandleProfilbildGenCommand behandelt den /profilbild-gen Command
func HandleProfilbildGenCommand(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	options := bot_interaction.ApplicationCommandData().Options
	if len(options) < 2 {
		utils.SendErrorEmbed(bot, bot_interaction, "❌ Ungültige Parameter", "Bitte gib den Typ und den Nickname an.", true)
	}

	typeValue := options[0].StringValue()
	nickname := options[1].StringValue()

	// Typ validieren
	var profileType ProfilePictureType
	switch typeValue {
	case "default":
		profileType = TypeDefault
	case "dark":
		profileType = TypeDark
		if !utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {
			utils.SendErrorEmbed(bot, bot_interaction, "❌ Keine Berechtigung", "Du hast keine Berechtigung, ein Team-Logo zu generieren.", true)
			return
		}
	case "banner":
		profileType = TypeBanner
	default:
		utils.SendErrorEmbed(bot, bot_interaction, "❌ Ungültiger Typ", "Der angegebene Typ ist ungültig. Bitte wähle eine der drei Möglichkeiten.", true)
		return
	}

	// Nickname validieren
	if len(nickname) > 50 {
		utils.SendInfoEmbed(bot, bot_interaction, "❌ Nickname zu lang", "Der Nickname darf maximal 50 Zeichen lang sein.", true)
		return
	}

	// Defer Response da die Bildgenerierung etwas dauern kann
	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Flags: discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "pb_gen.go", true, err, "Fehler beim Defer der Interaction Response")
		return
	}

	// Avatar-Daten erstellen
	avatarData := AvatarData{
		Nickname:       nickname,
		BackgroundType: profileType,
	}

	// Image Generator erstellen und Avatar generieren
	generator := NewImageGenerator()
	imageReader, err := generator.GenerateAvatar(avatarData)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "pb_gen.go", true, err, "Fehler beim Generieren des Avatars")
		
		_, err = bot.InteractionResponseEdit(bot_interaction.Interaction, &discordgo.WebhookEdit{
			Content: stringPtr("❌ Ein Fehler ist beim Generieren des Profilbildes aufgetreten."),
		})
		if err != nil {
			utils.LogAndNotifyAdmins(bot, "medium", "Error", "pb_gen.go", true, err, "Fehler beim Bearbeiten der Interaction Response")
		}
		return
	}

	// Discord-File erstellen
	file := &discordgo.File{
		Name:   "profilbild.png",
		Reader: imageReader,
	}

	// Response mit generiertem Bild senden
	_, err = bot.InteractionResponseEdit(bot_interaction.Interaction, &discordgo.WebhookEdit{
		Content: stringPtr("✅ Dein generiertes Profilbild:"),
		Files:   []*discordgo.File{file},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "pb_gen.go", true, err, "Fehler beim Senden des generierten Profilbildes")
		return
	}

	// Erfolgreiche Generierung loggen
	utils.LogAndNotifyAdmins(bot, "info", "Info", "pb_gen.go", false, nil, 
		fmt.Sprintf("Profilbild generiert für User %s (%s) - Typ: %s, Nickname: %s", 
			bot_interaction.Member.User.Username, bot_interaction.Member.User.ID, typeValue, nickname))
}

// stringPtr gibt einen Pointer auf einen String zurück
func stringPtr(s string) *string {
	return &s
}