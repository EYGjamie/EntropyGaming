package discord_administration_channel_text

import (
	"os"
	"strings"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

// StartChannelPurger purged täglich eine Liste an Channels
func StartChannelPurger(bot *discordgo.Session) {
	channelsEnv := os.Getenv("CHANNELS_TO_PURGE_DAILY") // => DBMIGRATION
	if channelsEnv == "" {
		utils.LogAndNotifyAdmins(bot, "info", "Warnung", "timedPurger.go", true, nil, "CHANNELS_TO_PURGE_DAILY not set. No channels will be deleted.")
		return
	}
	channels := strings.Split(channelsEnv, ",")
	c := cron.New(cron.WithLocation(time.Local))
	_, err := c.AddFunc("0 4 * * *", func() {
		purgeChannels(bot, channels)
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "timedPurger.go", true, err, "Error adding purge function to cron scheduler")
	}
	c.Start()
}

func purgeChannels(bot *discordgo.Session, channels []string) {
	for _, chID := range channels {
		msgs, err := bot.ChannelMessages(chID, 100, "", "", "")
		if err != nil {
			utils.LogAndNotifyAdmins(bot, "medium", "Error", "timedPurger.go", false, err, "Error loading msg from Channel " + chID)
			continue
		}
		var ids []string
		for _, m := range msgs {
			ids = append(ids, m.ID)
		}
		if len(ids) == 0 {
			continue
		}

		if len(ids) > 1 {
			if err := bot.ChannelMessagesBulkDelete(chID, ids); err != nil {
				utils.LogAndNotifyAdmins(bot, "info", "Error", "timedPurger.go", false, err, "Error in bulk delete " + chID)
				for _, mid := range ids {
					if derr := bot.ChannelMessageDelete(chID, mid); derr != nil {
						utils.LogAndNotifyAdmins(bot, "low", "Error", "timedPurger.go", false, derr, "Erorr deleting msg in channel " + chID)
					}
				}
			}
		} else {
			if err := bot.ChannelMessageDelete(chID, ids[0]); err != nil {
				utils.LogAndNotifyAdmins(bot, "low", "Error", "timedPurger.go", false, err, "Error deleting msg in channel " + chID)
			}
		}
	}
}
