package tickets

import (
	"fmt"
	"log"
	"time"
	"bot/database"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleReopenButton(s *discordgo.Session, i *discordgo.InteractionCreate) {
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

	// Status in der Datenbank aktualisieren
	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_status = "Claimed", ticket_schliesser_id = ?, ticket_schliesser_name = ?, ticket_schliesszeit = ?
		WHERE ticket_id = ?`,
		i.Member.User.ID, i.Member.User.Username, time.Now().Unix(), ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren des Ticketstatus:", err)
		return
	}

	// Kanal aktualisieren
	_, err = s.ChannelEdit(i.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Reopen - Ticket von <@%s> - Ticket Bearbeiter <@%s> - Ticket geschlossen von <@%s> - Ticket erneut geöffnet von <@%s>", ticketID, ticket_db_info[4], ticket_db_info[7], ticket_db_info[10], i.Member.User.ID),
	})
	if err != nil {
		log.Println("Fehler beim Aktualisieren der Ticket Informationen in Discord:", err)
		return
	}

	// Berechtigungen erneut hinzufügen
	addUserChannelPermission(s, i.ChannelID, ticket_db_info[4])

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = s.ChannelMessageSend(i.ChannelID, fmt.Sprintf("<@%s> dein Ticket #%d wurde von <@%s> erneut geöffnet.", ticket_db_info[4], ticketID, i.Member.User.ID))
	if err != nil {
		log.Println("Fehler beim Senden der Benachrichtigung über den geschlossenen Status:", err)
	}

	// Embed aktualisieren
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Reopened", Inline: true},
		},
		Color: 0xFFD700, // Goldfarbe
	}

	// Buttons aktualisieren (Claim und Assign deaktivieren, reopen statt close)
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