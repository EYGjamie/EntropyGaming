package tickets

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleDeleteButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{
					Style:    discordgo.DangerButton,
					Label:    "Bestätigen",
					CustomID: "ticket_confirm_delete_ticket",
				},
				&discordgo.Button{
					Style:    discordgo.SecondaryButton,
					Label:    "Abbrechen",
					CustomID: "ticket_cancel_delete_ticket",
				},
			},
		},
	}

	// Embed erstellen
	embed := &discordgo.MessageEmbed{
		Title:       "Ticket Löschen?",
		Description: "Bist du sicher, dass du das Ticket löschen möchtest?",
		Color:       0xFF0000, // Rot
	}

	// embed und components senden
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: components,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleConfirmDelete erstellt das Transkript und löscht das Ticket
func HandleConfirmDelete(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	// Sende eine Nachricht: Transkript Erstellung und Ticket Löschung
	embed := &discordgo.MessageEmbed{
		Title:       "Löschung Bestätigt",
		Description: "Transkript wird erstellt. Ticket wird in Kürze gelöscht.",
		Color:       0xFF0000, // Rot
	}

	// InteractionResponse
	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Components: []discordgo.MessageComponent{},
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_delete.go", true, err, "Fehler beim Senden der Bestätigungsnachricht für die Ticketlöschung")
		return
	}

	// Ticket-ID abrufen
	ticketID, err := GetTicketIDFromInteraction(bot, bot_interaction)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Abrufen der Ticket-ID aus der Interaktion")
		return
	}

	// Datenbank-Informationen abrufen
	ticket_db_info := getTicketDbInfo(bot, ticketID)

	// Erstelle einen Ordner für Attachments in "ticket_bot/transcripts/attachements/<ticketID>"
	attachmentDir := fmt.Sprintf("./transcripts/attachements/%d", ticketID)
	if err := os.MkdirAll(attachmentDir, 0755); err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Erstellen des Verzeichnisses für Attachments")
		return
	}

	// Erstelle Transkript (Nachrichten sammeln)
	transcript, err := CollectTranscript(bot, bot_interaction.ChannelID, attachmentDir)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_delete.go", true, err, "Fehler beim Sammeln des Transkripts")
		return
	}
	
	// Transkript speichern
	transcriptPath := fmt.Sprintf("./transcripts/%d_%s.json", ticketID, ticket_db_info[5])
	err = WriteTranscriptToFile(bot, transcriptPath, transcript)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "critical", "Error", "mod_delete.go", true, err, "Fehler beim Schreiben des Transkripts in die Datei")
		return
	}

	// Datenbank aktualisieren
	_, err = database.DB.Exec(`UPDATE tickets SET ticket_status = "Deleted", ticket_loescher_id = ?, ticket_loescher_name = ?, ticket_loeschzeit = ? WHERE ticket_id = ?`, bot_interaction.Member.User.ID, bot_interaction.Member.User.Username, time.Now().Unix(), ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "warn", "Error", "mod_delete.go", true, err, "Fehler beim Aktualisieren des Ticket-Status in der Datenbank")
	}

	// SQL-Abfrage für die Datenbank, um die Werte aus den Spalten ticket_erstellungszeit, ticket_bearbeitungszeit und ticket_schliesszeit zu holen
	var createdTime, claimedTime, closedTime int64
	err = database.DB.QueryRow(`SELECT ticket_erstellungszeit, ticket_bearbeitungszeit, ticket_schliesszeit FROM tickets WHERE ticket_id = ?`, ticketID).Scan(&createdTime, &claimedTime, &closedTime)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Abrufen der Zeitstempel aus der Datenbank für Ticket-ID "+fmt.Sprint(ticketID))
		return
	}

	// Zusammenfassung des Tickets erstellen und posten
	summaryEmbed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d", ticketID),
		Color: 0xFF0000, // Entropy-Rot
	}

	// Felder hinzufügen, wenn die entsprechenden Werte vorhanden sind
	if ticket_db_info[4] != "NULL" {
		summaryEmbed.Fields = append(summaryEmbed.Fields, &discordgo.MessageEmbedField{
			Name:   "Created by",
			Value:  fmt.Sprintf("<@%s> <t:%d:R> | <t:%d>", ticket_db_info[4], createdTime, createdTime),
			Inline: false,
		})
	}
	if ticket_db_info[7] != "NULL" {
		summaryEmbed.Fields = append(summaryEmbed.Fields, &discordgo.MessageEmbedField{
			Name:   "Claimed by",
			Value:  fmt.Sprintf("<@%s> <t:%d:R> | <t:%d>", ticket_db_info[7], claimedTime, claimedTime),
			Inline: false,
		})
	}
	if ticket_db_info[10] != "NULL" {
		summaryEmbed.Fields = append(summaryEmbed.Fields, &discordgo.MessageEmbedField{
			Name:   "Closed by",
			Value:  fmt.Sprintf("<@%s> <t:%d:R> | <t:%d>", ticket_db_info[10], closedTime, closedTime),
			Inline: false,
		})
	}
	summaryEmbed.Fields = append(summaryEmbed.Fields, &discordgo.MessageEmbedField{
		Name:   "Deleted by",
		Value:  fmt.Sprintf("<@%s> <t:%d:R> | <t:%d>", bot_interaction.Member.User.ID, time.Now().Unix(), time.Now().Unix()),
		Inline: false,
	})

	// Teilnehmer und Nachrichten zählen
	participants := make(map[string]int)
	for _, msg := range transcript {
		if msg.UserID != bot.State.User.ID {
			participants[msg.UserID]++
		}
	}

	// Teilnehmerfeld erstellen
	participantField := &discordgo.MessageEmbedField{
		Name: "Participants",
	}

	// Teilnehmer und Nachrichten zählen
	for userID, msgCount := range participants {
		participantField.Value += fmt.Sprintf("%d messages by %s <@%s>\n", msgCount, userID, userID)
	}
	summaryEmbed.Fields = append(summaryEmbed.Fields, participantField)

	// Channel-ID für Transkript abrufen
	transcriptChannelID := utils.GetIdFromDB(bot, "CHANNEL_TICKET_TRANSCRIPS")

	// Statt das Transkript als Datei zu senden, wird ein Button am Embed hinzugefügt
	_, err = bot.ChannelMessageSendComplex(transcriptChannelID, &discordgo.MessageSend{
		Embeds: []*discordgo.MessageEmbed{summaryEmbed},
		Components: []discordgo.MessageComponent{
			discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{
					&discordgo.Button{
						Label: "View Transcript",
						Style: discordgo.LinkButton,
						URL:   fmt.Sprintf("http://www.entropygaming-tickets.de/ticket/%d", ticketID),
					},
				},
			},
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_delete.go", true, err, "Fehler beim Senden der Ticket-Zusammenfassung in den Transkript-Kanal")
	}

	// Transkript-Pfad in die Datenbank einfügen
	_, err = database.DB.Exec(`UPDATE tickets SET ticket_transcript = ? WHERE ticket_id = ?`, transcriptPath, ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_delete.go", true, err, "Fehler beim Einfügen des Transkript-Pfades in die Datenbank für Ticket-ID "+fmt.Sprint(ticketID))
	}

	// Kurze Wartezeit einfügen
	time.Sleep(5 * time.Second)

	// Kanal löschen
	bot.ChannelDelete(bot_interaction.ChannelID)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// CollectTranscript liest alle Nachrichten (inkl. Attachments) aus dem Discord-Channel
func CollectTranscript(bot *discordgo.Session, channelID, attachmentDir string) ([]MessageData, error) {
    // Falls das Verzeichnis noch nicht existiert, erstellen
    if err := os.MkdirAll(attachmentDir, 0755); err != nil {
        return nil, err
    }

    var messages []MessageData
    var beforeID string

    for {
        // Max. 100 Nachrichten pro Aufruf ziehen
        msgs, err := bot.ChannelMessages(channelID, 100, beforeID, "", "")
        if err != nil {
            utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Abrufen der Nachrichten für das Transkript")
            return nil, err
        }

        // Wenn keine Nachrichten mehr da sind, Schleife verlassen
        if len(msgs) == 0 {
            break
        }

        // Über alle abgefragten Nachrichten iterieren
        for _, msg := range msgs {
            var attachments []AttachmentData

            // Falls die Nachricht Attachments besitzt, downloaden
            for _, att := range msg.Attachments {
                localPath, err := saveAttachmentLocally(att.URL, att.Filename, attachmentDir)
                if err != nil {
                    utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_delete.go", true, err, "Fehler beim Speichern des Anhangs lokal")
                }

                attachments = append(attachments, AttachmentData{
                    ID:        att.ID,
                    Filename:  att.Filename,
                    URL:       att.URL,
                    LocalPath: localPath,
                })
            }

            // MessageData zusammenbauen
            messages = append(messages, MessageData{
                UserID:      msg.Author.ID,
                Username:    msg.Author.Username,
                Message:     msg.Content,
                Timestamp:   msg.Timestamp.Format(time.RFC3339),
                Attachments: attachments,
            })
        }

        // ID der letzten Nachricht als "before"-Parameter für den nächsten API-Call
        beforeID = msgs[len(msgs)-1].ID
    }

    return messages, nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// saveAttachmentLocally lädt die Datei aus der übergebenen URL herunter
func saveAttachmentLocally(url, filename, attachmentDir string) (string, error) {
    resp, err := http.Get(url)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    // Lokalen Pfad erzeugen (ggf. Anpassungen an Filename vornehmen)
    localPath := filepath.Join(attachmentDir, filename)

    out, err := os.Create(localPath)
    if err != nil {
        return "", err
    }
    defer out.Close()

    // Inhalt kopieren
    _, err = io.Copy(out, resp.Body)
    if err != nil {
        return "", err
    }

    return localPath, nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// WriteTranscriptToFile speichert ein JSON-Transkript in der angegebenen Datei ab.
func WriteTranscriptToFile(bot *discordgo.Session, path string, messages []MessageData) error {
    // JSON-Daten erstellen (schön formatiert)
    data, err := json.MarshalIndent(messages, "", "    ")
    if err != nil {
        utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Erstellen des JSON-Transkripts")
        return err
    }

    // Datei erstellen/überschreiben
    file, err := os.Create(path)
    if err != nil {
        utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Erstellen der Transkript-Datei")
        return err
    }
    defer file.Close()

    // JSON reinschreiben
    _, err = file.Write(data)
    if err != nil {
        utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_delete.go", true, err, "Fehler beim Schreiben des Transkripts in die Datei")
        return err
    }

    return nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleCancelDelete(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content:    "Löschen abgebrochen",
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: []discordgo.MessageComponent{},
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "mod_delete.go", true, err, "Fehler beim Senden der Abbruch-Nachricht für die Ticketlöschung")
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/