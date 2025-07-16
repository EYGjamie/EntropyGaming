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

// HandleAssignButton zeigt ein Modal zur Eingabe des Benutzernamens an
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

	// Modal für User-Eingabe anzeigen
	modal := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: fmt.Sprintf("ticket_assign_modal_%d", ticketID),
			Title:    "Ticket zuweisen",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						discordgo.TextInput{
							CustomID:    "assign_username",
							Label:       "Username oder Display Name eingeben",
							Style:       discordgo.TextInputShort,
							Placeholder: "z.B. MaxMustermann oder Max",
							Required:    true,
							MaxLength:   100,
						},
					},
				},
			},
		},
	}

	s.InteractionRespond(i.Interaction, modal)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignModal verarbeitet die Modal-Eingabe und sucht nach passenden Usern
func HandleAssignModal(s *discordgo.Session, i *discordgo.InteractionCreate) {
	// Ticket-ID aus CustomID extrahieren
	customID := i.ModalSubmitData().CustomID
	ticketIDStr := strings.TrimPrefix(customID, "ticket_assign_modal_")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		log.Println("Fehler beim Parsen der Ticket-ID:", err)
		return
	}

	// Eingabe aus Modal abrufen
	username := i.ModalSubmitData().Components[0].(*discordgo.ActionsRow).Components[0].(*discordgo.TextInput).Value

	// User in Datenbank suchen (sowohl username als auch display_name)
	var discordID, displayName string
	err = database.DB.QueryRow(`
		SELECT discord_id, display_name 
		FROM users 
		WHERE role_management = true 
		AND (LOWER(username) LIKE LOWER(?) OR LOWER(display_name) LIKE LOWER(?))
		LIMIT 1`,
		"%"+username+"%", "%"+username+"%").Scan(&discordID, &displayName)

	if err != nil {
		// Keine exakte Übereinstimmung - zeige ähnliche User
		rows, err := database.DB.Query(`
			SELECT discord_id, display_name 
			FROM users 
			WHERE role_management = true 
			AND (LOWER(username) LIKE LOWER(?) OR LOWER(display_name) LIKE LOWER(?))
			LIMIT 10`,
			"%"+username+"%", "%"+username+"%")
		
		if err != nil {
			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: "Fehler beim Suchen des Users.",
					Flags:   discordgo.MessageFlagsEphemeral,
				},
			})
			return
		}
		defer rows.Close()

		var suggestions []discordgo.SelectMenuOption
		for rows.Next() {
			var sugDiscordID, sugDisplayName string
			rows.Scan(&sugDiscordID, &sugDisplayName)
			suggestions = append(suggestions, discordgo.SelectMenuOption{
				Label: sugDisplayName,
				Value: sugDiscordID,
			})
		}

		if len(suggestions) == 0 {
			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: fmt.Sprintf("Kein Management-User mit '%s' gefunden.", username),
					Flags:   discordgo.MessageFlagsEphemeral,
				},
			})
			return
		}

		// Ähnliche User zur Auswahl anzeigen
		components := []discordgo.MessageComponent{
			discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{
					&discordgo.SelectMenu{
						CustomID:    fmt.Sprintf("ticket_assign_suggestions_%d", ticketID),
						Placeholder: "Meintest du einen dieser User?",
						Options:     suggestions,
					},
				},
			},
		}

		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content:    fmt.Sprintf("Mehrere User mit '%s' gefunden:", username),
				Flags:      discordgo.MessageFlagsEphemeral,
				Components: components,
			},
		})
		return
	}

	// Exakte Übereinstimmung - direkt zuweisen
	assignTicketToUser(s, i, ticketID, discordID, displayName)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignSuggestions verarbeitet die Auswahl aus dem Suggestions-Dropdown
func HandleAssignSuggestions(s *discordgo.Session, i *discordgo.InteractionCreate, customID string) {
	// Ticket-ID extrahieren
	ticketIDStr := strings.TrimPrefix(customID, "ticket_assign_suggestions_")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		log.Println("Fehler beim Parsen der Ticket-ID:", err)
		return
	}

	// Ausgewählten User abrufen
	selectedDiscordID := i.MessageComponentData().Values[0]
	
	// Display Name aus DB abrufen
	var displayName string
	err = database.DB.QueryRow("SELECT display_name FROM users WHERE discord_id = ?", selectedDiscordID).Scan(&displayName)
	if err != nil {
		log.Println("Fehler beim Abrufen des Display Names:", err)
		return
	}

	assignTicketToUser(s, i, ticketID, selectedDiscordID, displayName)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// assignTicketToUser führt die tatsächliche Zuweisung des Tickets durch
func assignTicketToUser(s *discordgo.Session, i *discordgo.InteractionCreate, ticketID int, discordID, displayName string) {
	// Ticket in der Datenbank aktualisieren
	_, err := database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		discordID, displayName, time.Now().Unix(), ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren des Tickets:", err)
		return
	}

	// Ticket-Informationen abrufen
	ticket_db_info := getTicketDbInfo(ticketID)

	// Kanal aktualisieren
	s.ChannelEdit(i.ChannelID, &discordgo.ChannelEdit{
		Name:  fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], discordID),
	})

	// Bestätigungsnachricht
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Ticket #%d erfolgreich an %s zugewiesen.", ticketID, displayName),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})

	// Nachricht im Kanal senden
	_, err = s.ChannelMessageSend(i.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, discordID))
	if err != nil {
		log.Println("Fehler beim Senden der Benachrichtigung über den User dem das Ticket zugewiesen wurde:", err)
	}

	// Embed für Moderation Panel aktualisieren
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Claimed", Inline: true},
			{Name: "Zugewiesen an", Value: displayName, Inline: true},
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

	// Moderation Panel aktualisieren (suche nach der Message mit den Buttons)
	messages, err := s.ChannelMessages(i.ChannelID, 50, "", "", "")
	if err != nil {
		log.Println("Fehler beim Abrufen der Kanal-Nachrichten:", err)
		return
	}

	for _, message := range messages {
		if len(message.Components) > 0 && len(message.Embeds) > 0 {
			// Prüfe ob es das Moderation Panel ist
			if strings.Contains(message.Embeds[0].Title, "Moderation") {
				s.ChannelMessageEditComplex(&discordgo.MessageEdit{
					ID:         message.ID,
					Channel:    i.ChannelID,
					Embeds:     &[]*discordgo.MessageEmbed{embed},
					Components: &updatedComponents,
				})
				break
			}
		}
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignTicketUpdate führt die Zuweisung durch (Rückwärtskompatibilität für bestehende Dropdown-Funktionalität)
func HandleAssignTicketUpdate(s *discordgo.Session, i *discordgo.InteractionCreate, CustomID string) {
	var err error

	// Prüfe ob es sich um ein Suggestions-Dropdown handelt
	if strings.HasPrefix(CustomID, "ticket_assign_suggestions_") {
		HandleAssignSuggestions(s, i, CustomID)
		return
	}

	// Original-Dropdown Logik für Rückwärtskompatibilität
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
		Name:  fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
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
			{Name: "Status", Value: "Claimed", Inline: true},
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
		ID:         messageID,
		Channel:    i.ChannelID,
		Embeds:     &[]*discordgo.MessageEmbed{embed},
		Components: &updatedComponents,
	})

	// Nachricht zur Bestätigung senden
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Das Ticket wurde <@%s> zugewiesen.", moderatorID),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/