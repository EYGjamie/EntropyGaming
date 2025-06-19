package surveys

import (
	"log"
	"time"
	"bot/database"

	"github.com/bwmarrin/discordgo"
)


/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleSurveyDropdown(s *discordgo.Session, i *discordgo.InteractionCreate) {
	selected := i.MessageComponentData().Values[0]
	if selected == "other" {
		err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseModal,
			Data: &discordgo.InteractionResponseData{
				CustomID: "ticket_after_survey_modal",
				Title:    "Sonstige Antwort",
				Components: []discordgo.MessageComponent{
					discordgo.ActionsRow{
						Components: []discordgo.MessageComponent{
							&discordgo.TextInput{
								CustomID: "ticket_after_custom_answer",
								Label:    "Bitte gib hier deine Antwort ein",
								Style:    discordgo.TextInputShort,
								Required: true,
							},
						},
					},
				},
			},
		})
		if err != nil {
			log.Println("Fehler beim Anzeigen des Umfrage-Modals:", err)
		}
	} else {
		var userID, username string
		if i.Member != nil {
			userID = i.Member.User.ID
			username = i.Member.User.Username
		} else if i.User != nil {
			userID = i.User.ID
			username = i.User.Username
		} else {
			log.Println("Fehler: Benutzerinformationen nicht verfügbar")
			return
		}
		_, err := database.DB.Exec("INSERT INTO survey_answers (user_id, username, answer, timestamp) VALUES (?, ?, ?, ?)",
			userID, username, selected, time.Now().Unix())
		if err != nil {
			log.Println("Fehler beim Speichern der Umfrageantwort:", err)
		}
		err = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseUpdateMessage,
			Data: &discordgo.InteractionResponseData{
				Content:    "Danke für deine Antwort!",
				Components: []discordgo.MessageComponent{},
			},
		})
		if err != nil {
			log.Println("Fehler beim Aktualisieren der Umfrage-Nachricht:", err)
		}
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleSurveyModalSubmit verarbeitet die Eingabe im Modal
func HandleSurveyModalSubmit(s *discordgo.Session, i *discordgo.InteractionCreate) {
    modalData := i.ModalSubmitData()
	if modalData.CustomID == "" {
		log.Println("ModalSubmitData is empty")
		return
	}

    var customAnswer string

	if len(modalData.Components) == 0 {
        log.Println("Keine Components im Modal gefunden")
        return
    }

    for _, comp := range modalData.Components {
        row, ok := comp.(*discordgo.ActionsRow)
        if !ok || row.Components == nil {
            continue
        }
        for _, component := range row.Components {
            input, ok := component.(*discordgo.TextInput)
            if ok && input.CustomID == "custom_answer" {
                customAnswer = input.Value
            }
        }
    }

    if customAnswer == "" {
        // log.Println("Keine Antwort im Survey Modal gefunden")
        customAnswer = "other"
    }

    var userID, username string
    if i.Member != nil {
        userID = i.Member.User.ID
        username = i.Member.User.Username
    } else if i.User != nil {
        userID = i.User.ID
        username = i.User.Username
    } else {
        log.Println("Benutzerinformationen nicht verfügbar")
        return
    }

    _, err := database.DB.Exec("INSERT INTO survey_answers (user_id, username, answer, timestamp) VALUES (?, ?, ?, ?)",
        userID, username, customAnswer, time.Now().Unix())
    if err != nil {
        log.Println("Fehler beim Speichern der Umfrageantwort:", err)
    }

    err = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Content:    "Danke für deine Antwort!",
			Components: []discordgo.MessageComponent{},
		},
	})
	if err != nil {
		log.Println("Fehler beim Senden der Dankesnachricht:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/
