package tickets

import (
	"encoding/json"
	"fmt"
	"log"
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

func HandleDeleteButton(s *discordgo.Session, i *discordgo.InteractionCreate) {
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

	// Bestätigung anzeigen
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
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
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
func HandleConfirmDelete(s *discordgo.Session, i *discordgo.InteractionCreate) {
	// Sende eine Nachricht: Transkript Erstellung und Ticket Löschung
	embed := &discordgo.MessageEmbed{
		Title:       "Löschung Bestätigt",
		Description: "Transkript wird erstellt. Ticket wird in Kürze gelöscht.",
		Color:       0xFF0000, // Rot
	}

	// InteractionResponse
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Components: []discordgo.MessageComponent{},
		},
	})
	if err != nil {
		log.Println("Fehler beim Aktualisieren der Nachricht:", err)
		return
	}

	// Ticket-ID abrufen
	ticketID, err := GetTicketIDFromInteraction(s, i)
	if err != nil {
		log.Println("Fehler beim Abrufen der Ticket-ID:", err)
		return
	}

	// Datenbank-Informationen abrufen
	ticket_db_info := getTicketDbInfo(ticketID)

	// Erstelle einen Ordner für Attachments in "ticket_bot/transcripts/attachements/<ticketID>"
	attachmentDir := fmt.Sprintf("./transcripts/attachements/%d", ticketID)
	if err := os.MkdirAll(attachmentDir, 0755); err != nil {
		log.Printf("Fehler beim Erstellen des Attachment-Ordners: %v", err)
		return
	}

	// Erstelle Transkript (Nachrichten sammeln)
	transcript, err := CollectTranscript(s, i.ChannelID, attachmentDir)
	if err != nil {
		log.Println("Fehler beim Sammeln des Transkripts:", err)
		return
	}
	
	// Transkript speichern
	transcriptPath := fmt.Sprintf("./transcripts/%d_%s.json", ticketID, ticket_db_info[5])
	err = WriteTranscriptToFile(transcriptPath, transcript)
	if err != nil {
		log.Println("Fehler beim Speichern des Transkripts:", err)
		return
	}

	// Datenbank aktualisieren
	_, err = database.DB.Exec(`UPDATE tickets SET ticket_status = "Deleted", ticket_loescher_id = ?, ticket_loescher_name = ?, ticket_loeschzeit = ? WHERE ticket_id = ?`, i.Member.User.ID, i.Member.User.Username, time.Now().Unix(), ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren des Ticketstatus auf 'Deleted':", err)
	}

	// SQL-Abfrage für die Datenbank, um die Werte aus den Spalten ticket_erstellungszeit, ticket_bearbeitungszeit und ticket_schliesszeit zu holen
	var createdTime, claimedTime, closedTime int64
	err = database.DB.QueryRow(`SELECT ticket_erstellungszeit, ticket_bearbeitungszeit, ticket_schliesszeit FROM tickets WHERE ticket_id = ?`, ticketID).Scan(&createdTime, &claimedTime, &closedTime)
	if err != nil {
		log.Println("Fehler beim Abrufen der Ticketzeiten aus der Datenbank:", err)
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
		Value:  fmt.Sprintf("<@%s> <t:%d:R> | <t:%d>", i.Member.User.ID, time.Now().Unix(), time.Now().Unix()),
		Inline: false,
	})

	// Teilnehmer und Nachrichten zählen
	participants := make(map[string]int)
	for _, msg := range transcript {
		if msg.UserID != s.State.User.ID {
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
	transcriptChannelID := utils.GetIdFromDB(s, "CHANNEL_TICKET_TRANSCRIPS")

	// Statt das Transkript als Datei zu senden, wird ein Button am Embed hinzugefügt
	_, err = s.ChannelMessageSendComplex(transcriptChannelID, &discordgo.MessageSend{
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
		log.Println("Fehler beim Senden der Zusammenfassung mit Button:", err)
	}

	// Transkript-Pfad in die Datenbank einfügen
	_, err = database.DB.Exec(`UPDATE tickets SET ticket_transcript = ? WHERE ticket_id = ?`, transcriptPath, ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren des Transkriptpfads in der Datenbank:", err)
	}

	// Kurze Wartezeit einfügen
	time.Sleep(5 * time.Second)

	// Kanal löschen
	s.ChannelDelete(i.ChannelID)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// CollectTranscript liest alle Nachrichten (inkl. Attachments) aus dem Discord-Channel
func CollectTranscript(s *discordgo.Session, channelID, attachmentDir string) ([]MessageData, error) {
    // Falls das Verzeichnis noch nicht existiert, erstellen
    if err := os.MkdirAll(attachmentDir, 0755); err != nil {
        return nil, err
    }

    var messages []MessageData
    var beforeID string

    for {
        // Max. 100 Nachrichten pro Aufruf ziehen
        msgs, err := s.ChannelMessages(channelID, 100, beforeID, "", "")
        if err != nil {
            log.Println("Fehler beim Abrufen der Nachrichten:", err)
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
                    // Statt Abbruch -> nur Log, damit der Rest weiterläuft
                    log.Printf("Fehler beim Herunterladen von %s: %v\n", att.URL, err)
                    // localPath bleibt leer, wir können aber dennoch ein AttachmentData erstellen
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
func WriteTranscriptToFile(path string, messages []MessageData) error {
    // JSON-Daten erstellen (schön formatiert)
    data, err := json.MarshalIndent(messages, "", "    ")
    if err != nil {
        log.Println("Fehler beim Marshaling der JSON-Daten:", err)
        return err
    }

    // Datei erstellen/überschreiben
    file, err := os.Create(path)
    if err != nil {
        log.Println("Fehler beim Erstellen der Datei:", err)
        return err
    }
    defer file.Close()

    // JSON reinschreiben
    _, err = file.Write(data)
    if err != nil {
        log.Println("Fehler beim Schreiben der Datei:", err)
        return err
    }

    return nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleCancelDelete(s *discordgo.Session, i *discordgo.InteractionCreate) {
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content:    "Löschen abgebrochen",
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: []discordgo.MessageComponent{},
		},
	})
	if err != nil {
		log.Println("Fehler beim Entfernen der Buttons:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/