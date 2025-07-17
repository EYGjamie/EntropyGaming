package tickets

import (
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
				utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, err, "Fehler beim Abrufen der Ticket-Daten")
				continue
			}
			var updates []string
			for rows.Next() {
				var channelID, creatorID, creatorName string
				err := rows.Scan(&channelID, &creatorID, &creatorName)
				if err != nil {
					utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, err, "Fehler beim Scannen der Ticket-Daten")
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
							utils.LogAndNotifyAdmins(bot, "low", "Error", "userleft_handler.go", true, sendErr, "Fehler beim Senden der Nachricht an den Ticket-Kanal")
						}
						updates = append(updates, channelID)
					} else {
						utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, err, "Fehler beim Überprüfen des Benutzers im Ticket-Kanal")
					}
				}
			}
			rows.Close()
			if len(updates) > 0 {
				tx, txErr := database.DB.Begin()
				if txErr != nil {
					utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, txErr, "Fehler beim Starten der Transaktion")
					continue
				}
				for _, channelID := range updates {
					_, updateErr := tx.Exec(`UPDATE tickets SET ticket_status = ? WHERE ticket_channel_id = ?`, "UserLeft", channelID)
					if updateErr != nil {
						utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, updateErr, "Fehler beim Aktualisieren des Ticket-Status in der Datenbank")
					}
				}
				if commitErr := tx.Commit(); commitErr != nil {
					utils.LogAndNotifyAdmins(bot, "high", "Error", "userleft_handler.go", true, commitErr, "Fehler beim Commit der Transaktion")
				}
			}
		}
	}()
}

/*--------------------------------------------------------------------------------------------------------------------------*/