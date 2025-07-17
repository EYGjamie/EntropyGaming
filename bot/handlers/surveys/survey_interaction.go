package surveys

import (
    "database/sql"
    "fmt"
	"strings"
	"log"

    "github.com/bwmarrin/discordgo"
)

// HandleComponent reagiert auf Dropdown-Auswahl
func HandleSurveyInteraction(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate, db *sql.DB) {
    // Inhalt der CustomID parsen
	idString := strings.TrimPrefix(bot_interaction.MessageComponentData().CustomID, "survey_")
	ids := strings.Split(idString, "_")

	if len(ids) != 2 {
		log.Printf("Invalid survey CustomID format: %s", bot_interaction.MessageComponentData().CustomID)
		return
	}

	surveyID := ids[0]
	userInternalID := ids[1]

    choice := bot_interaction.MessageComponentData().Values[0] // ausgewähltes Label

    // 1) in survey_user_answers speichern
    if _, err := db.Exec(
        `INSERT INTO survey_user_answers(user_id, survey_id, answer) VALUES(?, ?, ?)`,
        userInternalID, surveyID, choice,
    ); err != nil {
        // still continue, aber log ggf.
    }

    // 2) surveys.total_answers inkrementieren
    db.Exec(`UPDATE surveys SET total_answers = total_answers + 1 WHERE id = ?`, surveyID)

    // 3) Original-Nachricht updaten: Embed ändern, Components entfernen
    thankEmbed := &discordgo.MessageEmbed{
        Title:       "Danke für deine Antwort!",
        Description: fmt.Sprintf("Deine Wahl: **%s** wurde gespeichert.", choice),
        Color:       0x1DB954,
    }
    bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
        Type: discordgo.InteractionResponseUpdateMessage,
        Data: &discordgo.InteractionResponseData{
            Embeds:     []*discordgo.MessageEmbed{thankEmbed},
            Components: []discordgo.MessageComponent{}, // Dropdown löschen für keine doppelte Interaktion
        },
    })
}
