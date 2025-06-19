package discord_administration

import (
	"os"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

// StartChannelPurger purged täglich eine Liste an Channels
func StartChannelPurger(s *discordgo.Session) {
	channelsEnv := os.Getenv("CHANNELS_TO_PURGE_DAILY")
	if channelsEnv == "" {
		LogAndNotifyAdmins(s, "Mittel", "Warnung", "timedPurger.go", 16, nil, "CHANNELS_TO_PURGE_DAILY ist nicht gesetzt. Keine Channels werden täglich gelöscht.")
		return
	}
	channels := strings.Split(channelsEnv, ",")
	c := cron.New(cron.WithLocation(time.Local))
	//Syntax Minute Stunde TagMonat Monat Wochentag
	_, err := c.AddFunc("0 4 * * *", func() {
		purgeChannels(s, channels)
	})
	if err != nil {
		LogAndNotifyAdmins(s, "Hoch", "Error", "timedPurger.go", 26, err, "Fehler beim Planen des täglichen Channel-Purgers")
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
			LogAndNotifyAdmins(s, "Mittel", "Error", "timedPurger.go", 38, err, "Fehler beim Laden der Nachrichten für Channel "+chID)
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
				LogAndNotifyAdmins(s, "Keine", "Error", "timedPurger.go", 51, err, "Bulk-Löschen in "+chID+" fehlgeschlagen. Versuche Einzellöschen.")
				for _, mid := range ids {
					if derr := s.ChannelMessageDelete(chID, mid); derr != nil {
						LogAndNotifyAdmins(s, "Niedrig", "Error", "timedPurger.go", 54, derr, "Einzellöschen in "+chID+" fehlgeschlagen für Nachricht "+mid)
					}
				}
			}
		} else {
			if err := s.ChannelMessageDelete(chID, ids[0]); err != nil {
				LogAndNotifyAdmins(s, "Niedrig", "Error", "timedPurger.go", 60, err, "Einzellöschen in "+chID+" fehlgeschlagen für Nachricht "+ids[0])
			}
		}
	}
}
