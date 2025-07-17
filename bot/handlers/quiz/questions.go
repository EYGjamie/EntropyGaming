package quiz

import (
	"database/sql"
	"fmt"
	"strings"
	"strconv"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
	"bot/database"
	"bot/utils"
)

// RegisterQuiz startet Scheduler und Interaction-Handler
func RegisterQuiz(bot *discordgo.Session) {
	startQuizScheduler(bot)
}

func startQuizScheduler(bot *discordgo.Session) {
	c := cron.New(cron.WithLocation(time.Local))
	_, err := c.AddFunc(utils.GetIdFromDB(bot, "QUIZ_CRON_SPEC"), func() { postDailyQuiz(bot) })
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "questions.go", true, err, "Error adding quiz post function to cron scheduler")
	}
	c.Start()
}

func postDailyQuiz(bot *discordgo.Session) {
	chID := utils.GetIdFromDB(bot, "CHANNEL_QUIZ_ID")
	today := time.Now().Format("2006-01-02")
	q := struct {
		ID       int
		Question string
		A1, A2, A3 string
	}{ }
	err := database.DB.QueryRow(
		`SELECT id, question, answer1, answer2, answer3 FROM quiz_questions WHERE scheduled_date = ?`,
		today,
	).Scan(&q.ID, &q.Question, &q.A1, &q.A2, &q.A3)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.LogAndNotifyAdmins(bot, "info", "Info", "questions.go", false, nil, "No quiz question scheduled for today")
		}
		return
	}
	msgs, _ := bot.ChannelMessages(chID, 10, "", "", "")
	roleID := utils.GetIdFromDB(bot, "ROLE_QUIZ")
	for _, m := range msgs {
		if roleID != "" && strings.Contains(m.Content, fmt.Sprintf("<@&%s>", roleID)) ||
		   (len(m.Embeds) > 0 && m.Embeds[0].Title == "Quiz des Tages") {
			bot.ChannelMessageDelete(chID, m.ID)
		}
	}

	if roleID != "" {
		bot.ChannelMessageSend(chID, fmt.Sprintf("<@&%s>", roleID))
	}

	// build embed and select
	emb := &discordgo.MessageEmbed{
		Title:       "Quiz des Tages",
		Description: "## " + q.Question,
		Color:       0xff0000, // Rot
	}
	sel := discordgo.SelectMenu{
		CustomID: fmt.Sprintf("quiz_answer_%d", q.ID),
		Placeholder: "Wähle deine Antwort",
		Options: []discordgo.SelectMenuOption{
			{Label: q.A1, Value: "1"},
			{Label: q.A2, Value: "2"},
			{Label: q.A3, Value: "3"},
		},
	}
	_, err = bot.ChannelMessageSendComplex(chID, &discordgo.MessageSend{
		Embeds: []*discordgo.MessageEmbed{emb},
		Components: []discordgo.MessageComponent{
			discordgo.ActionsRow{Components: []discordgo.MessageComponent{sel}},
		},
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "questions.go", true, err, "Error sending daily quiz message")
	}
}

func HandleAnswerSelect(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {

	data := bot_interaction.MessageComponentData()

	if !strings.HasPrefix(data.CustomID, "quiz_answer_") {
		return
	}

	// Parse question ID from custom ID
	qidStr := strings.TrimPrefix(data.CustomID, "quiz_answer_")
	qid, _ := strconv.Atoi(qidStr)
	selVal := data.Values[0]
	sel, _ := strconv.Atoi(selVal)

	// 1) Sicherstellen, dass der User in users existiert
	uid, err := utils.EnsureUser(bot, bot_interaction.Member.User.ID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "questions.go", true, err, "Error ensuring user for quiz answer")
		return
	}

	// 2) Sicherstellen, dass der User nicht schon geantwortet hat
	var exists int
	err = database.DB.QueryRow(
		`SELECT 1 FROM quiz_responses WHERE user_id = ? AND question_id = ?`, 
		uid, qid,
	).Scan(&exists)
	if err != sql.ErrNoRows {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Du hast bereits geantwortet!",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// 3) Richtige Antwort abfragen
	var correct int
	_ = database.DB.QueryRow(
		`SELECT correct FROM quiz_questions WHERE id = ?`, qid,
	).Scan(&correct)

	// 4) Response in DB speichern, user_id = internes UID
	isCorrect := 0
	if sel == correct {
		isCorrect = 1
	}
	_, err = database.DB.Exec(
		`INSERT INTO quiz_responses (user_id, question_id, selected, correct, answered_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		uid, qid, sel, isCorrect,
	)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "questions.go", true, err, "Error saving quiz response")
	}

	// 5) Ephemeral Feedback
	msg := "# Leider falsch."
	if isCorrect == 1 {
		msg = "# Richtig!"
	}
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
		Content: msg,
		Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}
