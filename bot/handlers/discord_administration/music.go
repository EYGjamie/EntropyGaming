package discord_administration

import (
	"github.com/bwmarrin/discordgo"
)

// HandleMusic sendet ein Ephemeral-Embed an den Aufrufer
func HandleMusic(s *discordgo.Session, i *discordgo.InteractionCreate) {
	embed := &discordgo.MessageEmbed{
		Title:       	"Kurzfassung zum Musik-Bot",
		Description: 	"**!join** - Musik Bot joint eurem Voice Channel\n" +
						"**!play [Songname/ Link]** - Bot spielt den entsprechenden Song bzw. packt ihn in die Warteschlange\n" +
						"**!search [Keyword]** - Bot sucht nach Musik, die zum entsprechenden Keyword passt und zeigt euch eine Liste\n" +
						"**!pause** - pausiert die Musik\n" +
						"**!resume** - setzt die Musik fort\n" +
						"**!queue** - zeigt die Warteschlange an\n" +
						"**!skip** - überspringt den aktuellen Song\n" +
						"**!volume [Zahl]** - Lautstärke der Musik, 0-200\n" +
						"**!clean** - löscht alle Nachrichten vom Bot automatisch aus eurem Channel, damit keiner aufräumen muss 🙂\n" +
						"**!leave** - Bot verlässt euren Voicechannel\n" +
						"**!select [Songname]** - spielt einen bestimmten Song ab\n" +
						"**!radio [Name des Radio-Senders]** - Internet Radio",
		Color:       	0x1DB954, // Spotify Green	
	}
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:  discordgo.MessageFlagsEphemeral,
		},
	})
}
