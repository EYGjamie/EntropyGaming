package tickets

import (
	"log"
	"time"
	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// CheckAndNotifyInactiveUsers checks for inactive users in tickets and notifies the server
func CheckAndNotifyInactiveUsers(bot *discordgo.Session) {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			rows, err := database.DB.Query(`
				SELECT ticket_channel_id, ticket_ersteller_id, ticket_ersteller_name
				FROM tickets
				WHERE ticket_status != "Deleted" AND ticket_status != "UserLeft"
			`)
			if err != nil {
				log.Println("Fehler beim Abrufen der Tickets:", err)
				continue
			}
			var updates []string
			for rows.Next() {
				var channelID, creatorID, creatorName string
				err := rows.Scan(&channelID, &creatorID, &creatorName)
				if err != nil {
					log.Println("Fehler beim Scannen der Ticket-Daten:", err)
					continue
				}
				_, err = bot.GuildMember(utils.GetIdFromDB(bot, "GUILD_ID"), creatorID)
				if err != nil {
					if discordErr, ok := err.(*discordgo.RESTError); ok && discordErr.Message != nil && discordErr.Message.Code == discordgo.ErrCodeUnknownMember {
						message := &discordgo.MessageEmbed{
							Title:       "Benutzer nicht mehr auf dem Server",
							Description: "Der Ersteller dieses Tickets ist nicht mehr auf dem Server.",
							Color:       0xFF0000, // Rot
						}
						_, sendErr := bot.ChannelMessageSendEmbed(channelID, message)
						if sendErr != nil {
							log.Println("Fehler beim Senden der Nachricht:", sendErr)
						}
						updates = append(updates, channelID)
					} else {
						log.Println("Fehler beim Überprüfen des Benutzers:", err)
					}
				}
			}
			rows.Close()
			if len(updates) > 0 {
				tx, txErr := database.DB.Begin()
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
				if commitErr := tx.Commit(); commitErr != nil {
					log.Println("Fehler beim Commit der Transaktion:", commitErr)
				}
			}
		}
	}()
}

/*--------------------------------------------------------------------------------------------------------------------------*/