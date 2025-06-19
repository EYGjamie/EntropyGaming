package tickets

import (
	"fmt"
	"log"
	"time"
	"bot/database"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleClaimButton(s *discordgo.Session, i *discordgo.InteractionCreate) {
	// Berechtigungsprüfung
	hasPermission, err := CheckUserPermissions(s, i.GuildID, i.Member.User.ID)
	if err != nil {
		log.Println("Fehler beim Überprüfen der Benutzerberechtigungen:", err)
		return
	}
	if !hasPermission {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Du hast keine Berechtigung, diese Aktion auszuführen.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Ticket-ID aus Kanalnamen extrahieren
	ticketID, err := GetTicketIDFromInteraction(s, i)
	if err != nil {
		log.Println("Fehler beim Abrufen der Ticket-ID:", err)
		return
	}

	// Ticket-Informationen aus der Datenbank abrufen
	ticket_db_info := getTicketDbInfo(ticketID)

	// Datenbank aktualisieren
	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		i.Member.User.ID, i.Member.User.Username, time.Now().Unix(), ticketID)

	if err != nil {
		log.Println("Fehler beim Claim des Tickets:", err)
		return
	}

	// Kanal aktualisieren
	s.ChannelEdit(i.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], i.Member.User.Username),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], i.Member.User.ID),
	})

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = s.ChannelMessageSend(i.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, i.Member.User.ID))
	if err != nil {
		log.Println("Fehler beim Senden der Benachrichtigung über den geclaimt Status:", err)
	}

	// Embed aktualisieren
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Claim", Inline: true},
		},
		Color: 0xFFD700, // Goldfarbe
	}

	// Buttons aktualisieren (Claim und Assign deaktivieren)
	updatedComponents := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Claim", CustomID: "ticket_button_claim", Disabled: true},
				&discordgo.Button{Style: discordgo.SecondaryButton, Label: "Close", CustomID: "ticket_button_close"},
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Assign", CustomID: "ticket_button_assign", Disabled: true},
				&discordgo.Button{Style: discordgo.DangerButton, Label: "Delete", CustomID: "ticket_button_delete"},
			},
		},
	}

	// Nachricht aktualisieren
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Components: updatedComponents,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/
