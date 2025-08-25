package quiz

import (
	"fmt"
	"strings"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// LeaderboardEntry repräsentiert einen Eintrag im Leaderboard
type LeaderboardEntry struct {
	UserID          int64
	DiscordUsername string
	TotalQuestions  int
	CorrectAnswers  int
	WrongAnswers    int
	AccuracyRate    float64
	Score           float64 // Gewichteter Score basierend auf Anzahl und Genauigkeit
}

// HandleQuizLeaderboard behandelt den /quiz_leaderboard Command
func HandleQuizLeaderboard(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	// Leaderboard-Daten aus der Datenbank abrufen
	leaderboard, err := getQuizLeaderboard()
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "leaderboard.go", true, err, "Error fetching quiz leaderboard")
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Abrufen des Quiz-Leaderboards.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	if len(leaderboard) == 0 {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "📊 Es wurden noch keine Quiz-Antworten gefunden!",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Embed erstellen
	embed := createLeaderboardEmbed(leaderboard)

	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
		},
	})
}

// getQuizLeaderboard ruft die Leaderboard-Daten aus der Datenbank ab
func getQuizLeaderboard() ([]LeaderboardEntry, error) {
	query := `
	SELECT 
		u.discord_id,
		u.username,
		COUNT(*) as total_questions,
		SUM(qr.correct) as correct_answers,
		COUNT(*) - SUM(qr.correct) as wrong_answers,
		CASE 
			WHEN COUNT(*) > 0 THEN CAST(SUM(qr.correct) AS FLOAT) / COUNT(*) * 100
			ELSE 0 
		END as accuracy_rate,
		-- Score-Berechnung: Gewichtung von Anzahl beantworteter Fragen und Genauigkeit
		-- Formel: (correct_answers * 2) + (total_questions * 0.1) 
		-- Dies belohnt sowohl Genauigkeit als auch Aktivität
		(SUM(qr.correct) * 2) + (COUNT(*) * 0.1) as score
	FROM quiz_responses qr
	INNER JOIN users u ON qr.user_id = u.id
	GROUP BY qr.user_id, u.discord_id, u.username
	HAVING COUNT(*) >= 1  -- Mindestens 1 Frage beantwortet
	ORDER BY score DESC, accuracy_rate DESC, total_questions DESC
	LIMIT 25;
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leaderboard []LeaderboardEntry
	for rows.Next() {
		var entry LeaderboardEntry
		err := rows.Scan(
			&entry.UserID,
			&entry.DiscordUsername,
			&entry.TotalQuestions,
			&entry.CorrectAnswers,
			&entry.WrongAnswers,
			&entry.AccuracyRate,
			&entry.Score,
		)
		if err != nil {
			return nil, err
		}
		leaderboard = append(leaderboard, entry)
	}

	return leaderboard, nil
}

// createLeaderboardEmbed erstellt das Discord-Embed für das Leaderboard
func createLeaderboardEmbed(leaderboard []LeaderboardEntry) *discordgo.MessageEmbed {
	var description strings.Builder
	description.WriteString("🏆 **Quiz-Leaderboard - Top 25**\n\n")
	description.WriteString("*Ranking basiert auf einem gewichteten Score aus Genauigkeit und Aktivität*\n\n")

	// Medaillen für die Top 3
	medals := []string{"🥇", "🥈", "🥉"}

	for i, entry := range leaderboard {
		rank := i + 1
		var rankEmoji string

		if rank <= 3 {
			rankEmoji = medals[rank-1]
		} else {
			rankEmoji = fmt.Sprintf("`%2d.`", rank)
		}

		// Username kürzen falls zu lang
		username := entry.DiscordUsername
		if len(username) > 20 {
			username = username[:17] + "..."
		}

		description.WriteString(fmt.Sprintf(
			"%s **%s**\n"+
				"    📊 %d/%d richtig (%.1f%%) | Score: %.1f\n\n",
			rankEmoji,
			username,
			entry.CorrectAnswers,
			entry.TotalQuestions,
			entry.AccuracyRate,
			entry.Score,
		))
	}

	// Footer-Information
	footerText := "Score = (Richtige Antworten × 2) + (Gesamtfragen × 0.1)"

	embed := &discordgo.MessageEmbed{
		Title:       "🧠 Quiz-Leaderboard",
		Description: description.String(),
		Color:       0xFFD700, // Gold
		Footer: &discordgo.MessageEmbedFooter{
			Text: footerText,
		},
		Thumbnail: &discordgo.MessageEmbedThumbnail{
			URL: "",
		},
	}

	return embed
}
