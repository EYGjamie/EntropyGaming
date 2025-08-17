package utils

import (
	"time"
	
	"github.com/bwmarrin/discordgo"
)

// EmbedResponseOptions - Konfigurationsoptionen für Embed-Responses
type EmbedResponseOptions struct {
	Title       string
	Description string
	Color       int
	Fields      []*discordgo.MessageEmbedField
	Footer      *discordgo.MessageEmbedFooter
	Author      *discordgo.MessageEmbedAuthor
	Image       *discordgo.MessageEmbedImage
	Thumbnail   *discordgo.MessageEmbedThumbnail
	Timestamp   bool // Wenn true, wird aktueller Timestamp hinzugefügt
	Ephemeral   bool // Wenn true, wird Nachricht als ephemeral gesendet
}

// SendEmbedResponse - Sendet eine InteractionRespond als Embed
func SendEmbedResponse(bot *discordgo.Session, interaction *discordgo.InteractionCreate, options EmbedResponseOptions) error {
	embed := &discordgo.MessageEmbed{
		Title:       options.Title,
		Description: options.Description,
		Color:       options.Color,
		Fields:      options.Fields,
		Footer:      options.Footer,
		Author:      options.Author,
		Image:       options.Image,
		Thumbnail:   options.Thumbnail,
	}

	// Timestamp hinzufügen wenn gewünscht
	if options.Timestamp {
		embed.Timestamp = time.Now().Format(time.RFC3339)
	}

	// Response-Flags setzen
	var flags discordgo.MessageFlags
	if options.Ephemeral {
		flags = discordgo.MessageFlagsEphemeral
	}

	// Interaction Response senden
	return bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:  flags,
		},
	})
}

// SendEmbedResponseWithComponents - Sendet eine InteractionRespond als Embed mit Komponenten
func SendEmbedResponseWithComponents(bot *discordgo.Session, interaction *discordgo.InteractionCreate, options EmbedResponseOptions, components []discordgo.MessageComponent) error {
	embed := &discordgo.MessageEmbed{
		Title:       options.Title,
		Description: options.Description,
		Color:       options.Color,
		Fields:      options.Fields,
		Footer:      options.Footer,
		Author:      options.Author,
		Image:       options.Image,
		Thumbnail:   options.Thumbnail,
	}

	// Timestamp hinzufügen wenn gewünscht
	if options.Timestamp {
		embed.Timestamp = time.Now().Format(time.RFC3339)
	}

	// Response-Flags setzen
	var flags discordgo.MessageFlags
	if options.Ephemeral {
		flags = discordgo.MessageFlagsEphemeral
	}

	// Interaction Response senden
	return bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: components,
			Flags:      flags,
		},
	})
}

// UpdateEmbedResponse - Aktualisiert eine bestehende Nachricht mit einem neuen Embed
func UpdateEmbedResponse(bot *discordgo.Session, interaction *discordgo.InteractionCreate, options EmbedResponseOptions) error {
	embed := &discordgo.MessageEmbed{
		Title:       options.Title,
		Description: options.Description,
		Color:       options.Color,
		Fields:      options.Fields,
		Footer:      options.Footer,
		Author:      options.Author,
		Image:       options.Image,
		Thumbnail:   options.Thumbnail,
	}

	// Timestamp hinzufügen wenn gewünscht
	if options.Timestamp {
		embed.Timestamp = time.Now().Format(time.RFC3339)
	}

	// Update Response senden
	return bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
		},
	})
}

// UpdateEmbedResponseWithComponents - Aktualisiert eine bestehende Nachricht mit einem neuen Embed und Komponenten
func UpdateEmbedResponseWithComponents(bot *discordgo.Session, interaction *discordgo.InteractionCreate, options EmbedResponseOptions, components []discordgo.MessageComponent) error {
	embed := &discordgo.MessageEmbed{
		Title:       options.Title,
		Description: options.Description,
		Color:       options.Color,
		Fields:      options.Fields,
		Footer:      options.Footer,
		Author:      options.Author,
		Image:       options.Image,
		Thumbnail:   options.Thumbnail,
	}

	// Timestamp hinzufügen wenn gewünscht
	if options.Timestamp {
		embed.Timestamp = time.Now().Format(time.RFC3339)
	}

	// Update Response senden
	return bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: components,
		},
	})
}

// Vordefinierte Farben für häufig verwendete Embed-Typen
const (
	ColorSuccess = 0x00ff00  // Grün
	ColorError   = 0xff0000  // Rot
	ColorWarning = 0xffff00  // Gelb
	ColorInfo    = 0x0099ff  // Blau
	ColorGold    = 0xFFD700  // Gold
	ColorSpotify = 0x1DB954  // Spotify Grün
	ColorValorant = 0xFF4454 // Valorant Rot
)


// SendSuccessEmbed - Sendet ein grünes Success-Embed
func SendSuccessEmbed(bot *discordgo.Session, interaction *discordgo.InteractionCreate, title, description string, ephemeral bool) error {
	return SendEmbedResponse(bot, interaction, EmbedResponseOptions{
		Title:       title,
		Description: description,
		Color:       ColorSuccess,
		Ephemeral:   ephemeral,
		Timestamp:   true,
	})
}

// SendErrorEmbed - Sendet ein rotes Error-Embed
func SendErrorEmbed(bot *discordgo.Session, interaction *discordgo.InteractionCreate, title, description string, ephemeral bool) error {
	return SendEmbedResponse(bot, interaction, EmbedResponseOptions{
		Title:       title,
		Description: description,
		Color:       ColorError,
		Ephemeral:   ephemeral,
		Timestamp:   true,
	})
}

// SendInfoEmbed - Sendet ein blaues Info-Embed
func SendInfoEmbed(bot *discordgo.Session, interaction *discordgo.InteractionCreate, title, description string, ephemeral bool) error {
	return SendEmbedResponse(bot, interaction, EmbedResponseOptions{
		Title:       title,
		Description: description,
		Color:       ColorInfo,
		Ephemeral:   ephemeral,
		Timestamp:   true,
	})
}

// SendWarningEmbed - Sendet ein gelbes Warning-Embed
func SendWarningEmbed(bot *discordgo.Session, interaction *discordgo.InteractionCreate, title, description string, ephemeral bool) error {
	return SendEmbedResponse(bot, interaction, EmbedResponseOptions{
		Title:       title,
		Description: description,
		Color:       ColorWarning,
		Ephemeral:   ephemeral,
		Timestamp:   true,
	})
}