package tickets

import (
	"fmt"
	"time"
	"strconv"
	"strings"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignButton zeigt ein Modal zur Eingabe des Benutzernamens an
func HandleAssignButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	ticketID, err := GetTicketIDFromInteraction(bot, bot_interaction)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Abrufen der Ticket-ID aus der Interaktion")
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

	bot.InteractionRespond(bot_interaction.Interaction, modal)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignModal verarbeitet die Modal-Eingabe und sucht nach passenden Usern
func HandleAssignModal(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	// Ticket-ID aus CustomID extrahieren
	customID := bot_interaction.ModalSubmitData().CustomID
	ticketIDStr := strings.TrimPrefix(customID, "ticket_assign_modal_")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Parsen der Ticket-ID aus der Modal CustomID")
		return
	}

	// Eingabe aus Modal abrufen
	username := bot_interaction.ModalSubmitData().Components[0].(*discordgo.ActionsRow).Components[0].(*discordgo.TextInput).Value

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
			bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
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
			bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
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

		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
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
	assignTicketToUser(bot, bot_interaction, ticketID, discordID, displayName)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleAssignSuggestions verarbeitet die Auswahl aus dem Suggestions-Dropdown
func HandleAssignSuggestions(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate, customID string) {
	// Ticket-ID extrahieren
	ticketIDStr := strings.TrimPrefix(customID, "ticket_assign_suggestions_")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Parsen der Ticket-ID aus dem Suggestions CustomID")
		return
	}

	// Ausgewählten User abrufen
	selectedDiscordID := bot_interaction.MessageComponentData().Values[0]
	
	// Display Name aus DB abrufen
	var displayName string
	err = database.DB.QueryRow("SELECT display_name FROM users WHERE discord_id = ?", selectedDiscordID).Scan(&displayName)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Abrufen des Display Names für Discord ID: " + selectedDiscordID)
		return
	}

	assignTicketToUser(bot, bot_interaction, ticketID, selectedDiscordID, displayName)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// assignTicketToUser führt die tatsächliche Zuweisung des Tickets durch
func assignTicketToUser(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate, ticketID int, discordID, displayName string) {
	// Ticket in der Datenbank aktualisieren
	_, err := database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		discordID, displayName, time.Now().Unix(), ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_assign.go", true, err, "Fehler beim Aktualisieren des Tickets in der Datenbank")
		return
	}

	// Ticket-Informationen abrufen
	ticket_db_info := getTicketDbInfo(bot, ticketID)

	// Kanal aktualisieren
	bot.ChannelEdit(bot_interaction.ChannelID, &discordgo.ChannelEdit{
		Name:  fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], discordID),
	})

	// Bestätigungsnachricht
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Ticket #%d erfolgreich an %s zugewiesen.", ticketID, displayName),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})

	// Nachricht im Kanal senden
	_, err = bot.ChannelMessageSend(bot_interaction.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, discordID))
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Senden der Benachrichtigung über den User dem das Ticket zugewiesen wurde in Ticket #" + strconv.Itoa(ticketID))
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
	messages, err := bot.ChannelMessages(bot_interaction.ChannelID, 50, "", "", "")
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_assign.go", true, err, "Fehler beim Abrufen der letzten Nachrichten im Kanal für Ticket #" + strconv.Itoa(ticketID) + " zur Aktualisierung des Moderation Panels")
		return
	}

	for _, message := range messages {
		if len(message.Components) > 0 && len(message.Embeds) > 0 {
			// Prüfe ob es das Moderation Panel ist
			if strings.Contains(message.Embeds[0].Title, "Moderation") {
				bot.ChannelMessageEditComplex(&discordgo.MessageEdit{
					ID:         message.ID,
					Channel:    bot_interaction.ChannelID,
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
func HandleAssignTicketUpdate(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate, CustomID string) {
	var err error
	if strings.HasPrefix(CustomID, "ticket_assign_suggestions_") {
		HandleAssignSuggestions(bot, bot_interaction, CustomID)
		return
	}
	idString := strings.TrimPrefix(CustomID, "ticket_assign_ticket_dropdown_")
	ids := strings.Split(idString, "_")
	if len(ids) != 2 {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_assign.go", true, fmt.Errorf("invalid CustomID format: %s", CustomID), "Fehler beim Parsen der CustomID für die Ticket-Zuweisung")
		return
	}
	ticketID, err := strconv.Atoi(ids[0])
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_assign.go", true, err, "Fehler beim Parsen der Ticket-ID aus der CustomID")
		return
	}
	messageID := ids[1]
	moderatorID := bot_interaction.MessageComponentData().Values[0]
	moderatorUsername := GetUsernameByID(bot, moderatorID)
	ticket_db_info := getTicketDbInfo(bot, ticketID)
	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		moderatorID, moderatorUsername, time.Now().Unix(), ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_assign.go", true, err, "Fehler beim Aktualisieren des Tickets in der Datenbank")
		return
	}

	// Kanal aktualisieren
	bot.ChannelEdit(bot_interaction.ChannelID, &discordgo.ChannelEdit{
		Name:  fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], moderatorID),
	})

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = bot.ChannelMessageSend(bot_interaction.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, moderatorID))
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_assign.go", true, err, "Fehler beim Senden der Benachrichtigung über den User dem das Ticket zugewiesen wurde in Ticket #" + strconv.Itoa(ticketID))
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
	bot.ChannelMessageEditComplex(&discordgo.MessageEdit{
		ID:         messageID,
		Channel:    bot_interaction.ChannelID,
		Embeds:     &[]*discordgo.MessageEmbed{embed},
		Components: &updatedComponents,
	})

	// Nachricht zur Bestätigung senden
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Das Ticket wurde <@%s> zugewiesen.", moderatorID),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/