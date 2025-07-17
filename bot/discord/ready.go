// ToDo: Im onReady Event Handler sollen alle aktiven Slash Commands gelöscht werden BEVOR die neuen registriert werden, um Duplukate zu vermeiden

package discord

import (
	"log"
	"bot/handlers/tickets"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// ready-Handler wird noch ausgelagert in ready.go
func ready(bot *discordgo.Session, event *discordgo.Ready) {
	tickets.CheckAndNotifyInactiveUsers(bot) 					// Starting Inaktive-User-Notifier 
	log.Printf("Bot logged in as %s#%s", event.User.Username, event.User.Discriminator) 		// Stauts-Update "Bot is working"
}

/*--------------------------------------------------------------------------------------------------------------------------*/