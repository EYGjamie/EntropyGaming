package tickets

import (
	"database/sql"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// CheckAndNotifyInactiveUsers checks
func CheckAndNotifyInactiveUsers(s *discordgo.Session, db *sql.DB, guildID string) {
	ticker := time.NewTicker(5 * time.Minute)

	// Starte Überprüfung inaktiver Benutzer für Tickets
	go func() {
		for range ticker.C {

			// Tickets abrufen
			rows, err := db.Query(`
				SELECT ticket_channel_id, ticket_ersteller_id, ticket_ersteller_name
				FROM tickets
				WHERE ticket_status != "Deleted" AND ticket_status != "UserLeft"
			`)
			if err != nil {
				log.Println("Fehler beim Abrufen der Tickets:", err)
				continue
			}

			// Ergebnisse durchgehen
			var updates []string
			for rows.Next() {
				var channelID, creatorID, creatorName string

				// Daten scannen
				err := rows.Scan(&channelID, &creatorID, &creatorName)
				if err != nil {
					log.Println("Fehler beim Scannen der Ticket-Daten:", err)
					continue
				}

				// Überprüfen, ob der Benutzer auf dem Server ist
				_, err = s.GuildMember(guildID, creatorID)
				if err != nil {
					// Überprüfe, ob es sich um einen Discord REST Error handelt und ob Message vorhanden ist
					if discordErr, ok := err.(*discordgo.RESTError); ok && discordErr.Message != nil && discordErr.Message.Code == discordgo.ErrCodeUnknownMember {
						// Benutzer ist nicht mehr auf dem Server
						message := &discordgo.MessageEmbed{
							Title:       "Benutzer nicht mehr auf dem Server",
							Description: "Der Ersteller dieses Tickets ist nicht mehr auf dem Server.",
							Color:       0xFF0000, // Rot
						}

						// Nachricht senden
						_, sendErr := s.ChannelMessageSendEmbed(channelID, message)
						if sendErr != nil {
							log.Println("Fehler beim Senden der Nachricht:", sendErr)
						}

						// Zum Update hinzufügen
						updates = append(updates, channelID)
					} else {
						log.Println("Fehler beim Überprüfen des Benutzers:", err)
					}
				}
			}
			rows.Close() // Wichtig: Ressourcen freigeben!

			// Ticket-Status für alle ungültigen Benutzer aktualisieren
			if len(updates) > 0 {
				tx, txErr := db.Begin()
				if txErr != nil {
					log.Println("Fehler beim Erstellen der Transaktion:", txErr)
					continue
				}

				for _, channelID := range updates {
					_, updateErr := tx.Exec(`UPDATE tickets SET ticket_status = ? WHERE ticket_channel_id = ?`, "UserLeft", channelID)
					if updateErr != nil {
						log.Println("Fehler beim Aktualisieren des Ticket-Status:", updateErr)
					}
				}

				// Transaktion abschließen
				if commitErr := tx.Commit(); commitErr != nil {
					log.Println("Fehler beim Commit der Transaktion:", commitErr)
				}
			}
		}
	}()
}

/*--------------------------------------------------------------------------------------------------------------------------*/