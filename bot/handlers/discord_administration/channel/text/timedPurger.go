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
func StartChannelPurger(s *discordgo.Session) {
	channelsEnv := os.Getenv("CHANNELS_TO_PURGE_DAILY") // => DBMIGRATION
	if channelsEnv == "" {
		utils.LogAndNotifyAdmins(s, "info", "Warnung", "timedPurger.go", true, nil, "CHANNELS_TO_PURGE_DAILY not set. No channels will be deleted.")
		return
	}
	channels := strings.Split(channelsEnv, ",")
	c := cron.New(cron.WithLocation(time.Local))
	//Syntax Minute Stunde TagMonat Monat Wochentag
	_, err := c.AddFunc("0 4 * * *", func() {
		purgeChannels(s, channels)
	})
	if err != nil {
		utils.LogAndNotifyAdmins(s, "high", "Error", "timedPurger.go", true, err, "Error adding purge function to cron scheduler")
	}
	c.Start()
}

// purgeChannels löscht in jedem gegebenen Channel alle Nachrichten
// bulk delete is only possible if msg is not older than 14 days
func purgeChannels(s *discordgo.Session, channels []string) {
	for _, chID := range channels {
		// lade die letzten 100 Nachrichten
		msgs, err := s.ChannelMessages(chID, 100, "", "", "")
		if err != nil {
			utils.LogAndNotifyAdmins(s, "medium", "Error", "timedPurger.go", false, err, "Error loading msg from Channel " + chID)
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
			if err := s.ChannelMessagesBulkDelete(chID, ids); err != nil {
				utils.LogAndNotifyAdmins(s, "info", "Error", "timedPurger.go", false, err, "Error in bulk delete " + chID)
				for _, mid := range ids {
					if derr := s.ChannelMessageDelete(chID, mid); derr != nil {
						utils.LogAndNotifyAdmins(s, "low", "Error", "timedPurger.go", false, derr, "Erorr deleting msg in channel " + chID)
					}
				}
			}
		} else {
			if err := s.ChannelMessageDelete(chID, ids[0]); err != nil {
				utils.LogAndNotifyAdmins(s, "low", "Error", "timedPurger.go", false, err, "Error deleting msg in channel " + chID)
			}
		}
	}
}
