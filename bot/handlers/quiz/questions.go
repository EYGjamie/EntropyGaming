package quiz

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"strconv"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
	"bot/database"
	"bot/utils"
)

// RegisterQuiz startet Scheduler und Interaction-Handler
func RegisterQuiz(s *discordgo.Session) {
	startQuizScheduler(s)
}

func startQuizScheduler(s *discordgo.Session) {
	c := cron.New(cron.WithLocation(time.Local))
	_, err := c.AddFunc("00 18 * * *", func() { postDailyQuiz(s) })
	if err != nil {
		log.Fatalf("Quiz scheduler error: %v", err)
	}
	c.Start()
}

func postDailyQuiz(s *discordgo.Session) {
	chID := os.Getenv("CHANNEL_QUIZ_ID")
	if chID == "" {
		log.Println("CHANNEL_QUIZ_ID not set")
		return
	}
	// today's date
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
			log.Println("No quiz for today")
		}
		return
	}

	// clear previous quiz message and role ping
	msgs, _ := s.ChannelMessages(chID, 10, "", "", "")
	roleID := os.Getenv("ROLE_QUIZ")
	for _, m := range msgs {
		if roleID != "" && strings.Contains(m.Content, fmt.Sprintf("<@&%s>", roleID)) ||
		   (len(m.Embeds) > 0 && m.Embeds[0].Title == "Quiz des Tages") {
			s.ChannelMessageDelete(chID, m.ID)
		}
	}

	if roleID != "" {
		s.ChannelMessageSend(chID, fmt.Sprintf("<@&%s>", roleID))
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
	_, err = s.ChannelMessageSendComplex(chID, &discordgo.MessageSend{
		Embeds: []*discordgo.MessageEmbed{emb},
		Components: []discordgo.MessageComponent{
			discordgo.ActionsRow{Components: []discordgo.MessageComponent{sel}},
		},
	})
	if err != nil {
		log.Printf("Send quiz error: %v", err)
	}
}

func HandleAnswerSelect(s *discordgo.Session, i *discordgo.InteractionCreate) {

	data := i.MessageComponentData()

	if !strings.HasPrefix(data.CustomID, "quiz_answer_") {
		return
	}

	// Parse question ID from custom ID
	qidStr := strings.TrimPrefix(data.CustomID, "quiz_answer_")
	qid, _ := strconv.Atoi(qidStr)
	selVal := data.Values[0]
	sel, _ := strconv.Atoi(selVal)

	// 1) Sicherstellen, dass der User in users existiert
	uid, err := utils.EnsureUser(database.DB, i.Member.User.ID, i.Member.User.Username)
	if err != nil {
		log.Printf("EnsureUser failed for %s: %v", i.Member.User.ID, err)
		return
	}

	// 2) Sicherstellen, dass der User nicht schon geantwortet hat
	var exists int
	err = database.DB.QueryRow(
		`SELECT 1 FROM quiz_responses WHERE user_id = ? AND question_id = ?`, 
		uid, qid,
	).Scan(&exists)
	if err != sql.ErrNoRows {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
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
		log.Printf("Error inserting quiz_response: %v", err)
	}

	// 5) Ephemeral Feedback
	msg := "# Leider falsch."
	if isCorrect == 1 {
		msg = "# Richtig!"
	}
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
		Content: msg,
		Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}
