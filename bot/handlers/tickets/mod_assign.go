package tickets

import (
	"log"
	"fmt"
	"time"
	"strconv"
	"strings"

	"bot/database"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleAssignButton(s *discordgo.Session, i *discordgo.InteractionCreate) {
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

	// Ticket-ID ermitteln
	ticketID, err := GetTicketIDFromInteraction(s, i)
	if err != nil {
		log.Println("Fehler beim Abrufen der Ticket-ID:", err)
		return
	}

	// Nachricht-ID ermitteln (für Dropdown-Interaktion)
	messageID := i.Message.ID

	// Ticket-Bereich abrufen
	var ticketBereich string
	err = database.DB.QueryRow("SELECT ticket_bereich FROM tickets WHERE ticket_id = ?", ticketID).Scan(&ticketBereich)
	if err != nil {
		log.Println("Fehler beim Abrufen des Ticket-Bereichs:", err)
		return
	}

	// Moderatoren für den Bereich abrufen
	rows, err := database.DB.Query("SELECT staff_discord_user_id, staff_discord_user_name FROM entropy_staff_member WHERE staff_bereich = ?", ticketBereich)
	if err != nil {
		log.Println("Fehler beim Abrufen der Moderatoren:", err)
		return
	}
	defer rows.Close()

	// Moderatoren in Dropdown-Optionen speichern
	var options []discordgo.SelectMenuOption
	for rows.Next() {
		var userID, username string
		rows.Scan(&userID, &username)
		options = append(options, discordgo.SelectMenuOption{
			Label: username,
			Value: userID,
		})
	}

	// Wenn mehr als 25 Optionen vorhanden sind, auf die ersten 25 beschränken
	if len(options) > 25 {
		options = options[:25]
	}

	// Prüfen, ob Moderatoren vorhanden sind
	if len(options) == 0 {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Flags:      discordgo.MessageFlagsEphemeral,
				Content: "Es wurden keine Moderatoren für diesen Bereich gefunden.",
			},
		})
		return
	}

	// Dropdown anzeigen
	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.SelectMenu{
					CustomID:    fmt.Sprintf("ticket_assign_ticket_dropdown_%d_%s", ticketID, messageID),
					Placeholder: "Wähle einen Moderator aus...",
					Options:     options,
				},
			},
		},
	}

	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content:    "Wähle einen Moderator aus, um das Ticket zuzuweisen:",
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: components,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignTicketUpdate führt die Zuweisung durch
func HandleAssignTicketUpdate(s *discordgo.Session, i *discordgo.InteractionCreate, CustomID string) {
	var err error

	// Inhalt der CustomID parsen
	idString := strings.TrimPrefix(CustomID, "ticket_assign_ticket_dropdown_")
		ids := strings.Split(idString, "_")
		if len(ids) != 2 {
			log.Printf("Fehler beim Parsen der IDs: %v", idString)
			return
		}
		ticketID, err := strconv.Atoi(ids[0])
		if err != nil {
			log.Printf("Fehler beim Parsen der Ticket-ID: %v", err)
			return
		}
		messageID := ids[1]		

	// Moderator-ID nach ID
	moderatorID := i.MessageComponentData().Values[0]
	moderatorUsername := GetUsernameByID(s, moderatorID)

	// Ticket-Informationen aus der Datenbank abrufen
	ticket_db_info := getTicketDbInfo(ticketID)

	// Ticket in der Datenbank aktualisieren
	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		moderatorID, moderatorUsername, time.Now().Unix(), ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren des Tickets:", err)
		return
	}

	// Kanal aktualisieren
	s.ChannelEdit(i.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], moderatorID),
	})

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = s.ChannelMessageSend(i.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, moderatorID))
	if err != nil {
		log.Println("Fehler beim Senden der Benachrichtigung über den User dem das Ticket zugewiesen wurde:", err)
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

	// View aktualisieren
    s.ChannelMessageEditComplex(&discordgo.MessageEdit{
        ID:      messageID,
        Channel: i.ChannelID,
		Embeds:  &[]*discordgo.MessageEmbed{embed},
		Components: &updatedComponents,
    })

	// Nachricht zur Bestätigung senden
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Das Ticket wurde <@%s> zugewiesen.", moderatorID),
			Flags:      discordgo.MessageFlagsEphemeral,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/
