package discord

import (
	"os"

	"bot/utils"
	"bot/api"

	"github.com/bwmarrin/discordgo"
)

func StartAPI(bot *discordgo.Session) {
	if os.Getenv("ENABLE_API") == "true" {
		apiServer := api.NewAPIServer(bot, utils.GetIdFromDB(bot, "GUILD_ID"))
		go apiServer.StartAPI()
	}	
}