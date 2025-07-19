package stats

import (
	"fmt"
	"time"
	"bot/utils"
	statsService "bot/services/stats"

	"github.com/bwmarrin/discordgo"
)

func HandleStatsCommand(bot *discordgo.Session, interaction *discordgo.InteractionCreate) {
	service := statsService.NewStatsService(bot)
	
	// Command Options parsen
	options := interaction.ApplicationCommandData().Options
	
	var fromStr, toStr string
	if len(options) > 0 && options[0].Name == "from" {
		fromStr = options[0].StringValue()
	}
	if len(options) > 1 && options[1].Name == "to" {
		toStr = options[1].StringValue()
	}
	
	// Zeitraum parsen
	fromDate, toDate := service.ParseTimeRange(fromStr, toStr)
	
	// Stats abrufen (zentrale Service-Logik)
	stats, err := service.GetServerStats(interaction.GuildID, fromDate, toDate)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "discord_handler.go", true, err, "Fehler beim Abrufen der Server-Statistiken")
		respondWithError(bot, interaction, "❌ Fehler beim Abrufen der Statistiken!")
		return
	}

	// Discord Response erstellen
	respondWithStats(bot, interaction, stats)
}

func respondWithError(bot *discordgo.Session, interaction *discordgo.InteractionCreate, message string) {
	bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: message,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

func respondWithStats(bot *discordgo.Session, interaction *discordgo.InteractionCreate, stats *statsService.ServerStats) {
	// Discord Embed
	embed := &discordgo.MessageEmbed{
		Title: "🏆 Server Statistiken",
		Color: 0x00ff00,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "👥 Discord Member",
				Value:  fmt.Sprintf("%d", stats.DiscordMembers),
				Inline: true,
			},
			{
				Name:   "💎 Diamond Club Member",
				Value:  fmt.Sprintf("%d", stats.DiamondClubMembers),
				Inline: true,
			},
			{
				Name:   "📝 Nachrichten",
				Value:  fmt.Sprintf("%d", stats.Messages),
				Inline: true,
			},
			{
				Name:   "🎤 Voice Zeit",
				Value:  statsService.FormatDuration(stats.VoiceTimeSeconds),
				Inline: true,
			},
			{
				Name:   "📅 Zeitraum",
				Value:  fmt.Sprintf("%s bis %s", stats.FromDate, stats.ToDate),
				Inline: false,
			},
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// JSON für Entwickler
	jsonStats := fmt.Sprintf("```json\n{\n  \"discord_members\": %d,\n  \"diamond_club_members\": %d,\n  \"messages\": %d,\n  \"voice_time_seconds\": %d,\n  \"from_date\": \"%s\",\n  \"to_date\": \"%s\"\n}\n```",
		stats.DiscordMembers, stats.DiamondClubMembers, stats.Messages, stats.VoiceTimeSeconds, stats.FromDate, stats.ToDate)

	bot.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:  []*discordgo.MessageEmbed{embed},
			Content: jsonStats,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}