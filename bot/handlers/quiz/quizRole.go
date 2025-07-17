package quiz

import (
	"log"
	"os"

	"github.com/bwmarrin/discordgo"
)

// handleQuizCommand reagiert auf /quiz und postet Embed + Button
func HandleQuizCommand(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	embed := &discordgo.MessageEmbed{
		Title:       "🚀 Quiz Time! 🚀",
		Description: "Klick auf den Button, um täglich um 18 Uhr benachrichtigt zu werden, wenn ein neues Quiz verfügbar ist!",
		Color:       0x00ff88,
	}

	button := discordgo.Button{
		Label:    "Quiz-Ping",
		Style:    discordgo.SuccessButton,
		CustomID: "quiz_get_role",
	}

	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: []discordgo.MessageComponent{discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{button}}},
		},
	})
}

// handleQuizButton kümmert sich um Klicks auf unseren Button
func HandleQuizButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	roleID := os.Getenv("ROLE_QUIZ") // DBMIGRATION
	if roleID == "" {
		log.Println("ROLE_QUIZ nicht gesetzt")
		return
	}

	// Rolle hinzufügen
	err := bot.GuildMemberRoleAdd(bot_interaction.GuildID, bot_interaction.Member.User.ID, roleID)
	if err != nil {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Fehler beim Hinzufügen der Rolle.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Bestätigung
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Du hast nun die Quiz-Ping Rolle! 🎉",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}