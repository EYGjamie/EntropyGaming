// ToDo: Im onReady Event Handler sollen alle aktiven Slash Commands gelöscht werden BEVOR die neuen registriert werden, um Duplukate zu vermeiden

package discord

import (
	"log"
	"os"
	"bot/database"
	"bot/handlers/tickets"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// ready-Handler wird noch ausgelagert in ready.go
func ready(bot *discordgo.Session, event *discordgo.Ready) {
	tickets.CheckAndNotifyInactiveUsers(bot, database.DB, os.Getenv("GUILD_ID")) 					// Starting Inaktive-User-Notifier 
	// tickets.StartTicketStatusUpdater(s, database.DB, os.Getenv("CHANNEL_TICKET_STATUS_ID"))   	// Starting Ticket-Status-Updater
	log.Printf("Bot logged in as %s#%s", event.User.Username, event.User.Discriminator) 		// Stauts-Update "Bot is working"

	
}

/*--------------------------------------------------------------------------------------------------------------------------*/