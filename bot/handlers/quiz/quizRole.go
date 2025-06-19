package quiz

import (
	"log"
	"os"

	"github.com/bwmarrin/discordgo"
)

// handleQuizCommand reagiert auf /quiz und postet Embed + Button
func HandleQuizCommand(s *discordgo.Session, i *discordgo.InteractionCreate) {
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

	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: []discordgo.MessageComponent{discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{button}}},
		},
	})
}

// handleQuizButton kümmert sich um Klicks auf unseren Button
func HandleQuizButton(s *discordgo.Session, i *discordgo.InteractionCreate) {
	roleID := os.Getenv("ROLE_QUIZ")
	if roleID == "" {
		log.Println("ROLE_QUIZ nicht gesetzt")
		return
	}

	// Rolle hinzufügen
	err := s.GuildMemberRoleAdd(i.GuildID, i.Member.User.ID, roleID)
	if err != nil {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Fehler beim Hinzufügen der Rolle.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Bestätigung
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Du hast nun die Quiz-Ping Rolle! 🎉",
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}