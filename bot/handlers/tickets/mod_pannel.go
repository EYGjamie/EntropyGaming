package tickets

import (
	"fmt"
	"log"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// message structure for transcript
type MessageData struct {
    UserID      string           `json:"userID"`
    Username    string           `json:"username"`
    Message     string           `json:"message"`
    Timestamp   string           `json:"timestamp"`
    Attachments []AttachmentData `json:"attachments,omitempty"`
}

// AttachmentData enthält Metadaten zu einem Anhang
type AttachmentData struct {
    ID        string `json:"id"`
    Filename  string `json:"filename"`
    URL       string `json:"url"`
    LocalPath string `json:"localPath,omitempty"`
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// sends a pinned moderation view to the channel
func SendModerationView(s *discordgo.Session, channelID string, ticketID int, creatorName string) {
	embed := &discordgo.MessageEmbed{
		Title:       fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: creatorName, Inline: true},
			{Name: "Status", Value: "Open", Inline: true},
		},
		Color: 0xFFD700, // gold
	}

	components := getDefaultComponents()

	_, err := s.ChannelMessageSendComplex(channelID, &discordgo.MessageSend{
		Embeds:     []*discordgo.MessageEmbed{embed},
		Components: components,
	})
	if err != nil {
		log.Println("Fehler beim Senden des Moderations-Views:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func getDefaultComponents() []discordgo.MessageComponent {
	return []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{Style: discordgo.SuccessButton, Label: "Claim", CustomID: "ticket_button_claim"},
				&discordgo.Button{Style: discordgo.SecondaryButton, Label: "Close", CustomID: "ticket_button_close"},
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Assign", CustomID: "ticket_button_assign"},
				&discordgo.Button{Style: discordgo.DangerButton, Label: "Delete", CustomID: "ticket_button_delete"},
			},
		},
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

