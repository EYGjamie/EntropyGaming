package tickets

import (
	"fmt"
	"log"
	"os"
	"strings"
	"bot/database"
	"time"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// shows the modal for choosen ticket type
// The customID is used to determine which modal to show
func HandleTicketModal(s *discordgo.Session, i *discordgo.InteractionCreate, customID string) {
	modalTitle := ""
	var fields []discordgo.TextInput

	if customID == "" {
		log.Println("Fehler: CustomID ist leer.")
		return
	}

	switch customID {
	case "ticket_diamond_club":
		modalTitle = "Bewerbung Diamond Club"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: true},
			{Label: "Dein Main Game", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Gib uns kurz an wann du Zeit hast", Style: discordgo.TextInputParagraph, CustomID: "field_four", Required: true, MaxLength: 400},
		}	
	
	case "ticket_pro_teams":
		modalTitle = "Bewerbung für ein Pro Team"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: true},
			{Label: "Welches Spiel?", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Erfahrungen im Team?", Style: discordgo.TextInputParagraph, CustomID: "field_four", Required: true, MaxLength: 400},
			{Label: "Tracker & Social Media", Style: discordgo.TextInputParagraph, CustomID: "field_five", Required: true, MaxLength: 400},
		}

	case "ticket_bewerbung_staff":
		modalTitle = "Bewerbung Staff"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "Für was bewirbst du dich?", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Erfahrungen in dem Bereich?", Style: discordgo.TextInputParagraph, CustomID: "field_four", Required: true, MaxLength: 400},
			{Label: "Stelle dich kurz vor", Style: discordgo.TextInputParagraph, CustomID: "field_five", Required: true, MaxLength: 400},
		}

	case "ticket_content_creator":
		modalTitle = "Bewerbung Content Creator"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "Social Links", Style: discordgo.TextInputParagraph, CustomID: "field_three", Required: true, MaxLength: 400},
			{Label: "Weiteres", Style: discordgo.TextInputParagraph, CustomID: "field_four", Required: false, MaxLength: 400},
		}

	case "ticket_support_kontakt":
		modalTitle = "Support Anfrage"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Was ist dein Anliegen?", Style: discordgo.TextInputParagraph, CustomID: "field_two", Required: true, MaxLength: 750},
		}

	case "ticket_sonstiges":
		modalTitle = "Sonstige Anfragen"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Was ist dein Anliegen?", Style: discordgo.TextInputParagraph, CustomID: "field_two", Required: true, MaxLength: 750},
		}

	case "ticket_community_teams":
		HandleGameDropdown(s, i)
		return

	case "ticket_game_lol":
		modalTitle = "League of Legends Bewerbung"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "Main Rolle", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Rang", Style: discordgo.TextInputShort, CustomID: "field_four", Required: true},
			{Label: "op.gg Link", Style: discordgo.TextInputShort, CustomID: "field_five", Required: true},
		}

	case "ticket_game_r6":
		modalTitle = "RainbowSix Bewerbung"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "R6 Tracker Link", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Plattform", Style: discordgo.TextInputShort, CustomID: "field_four", Required: true},
			{Label: "Infos über DICH!", Style: discordgo.TextInputParagraph, CustomID: "field_five", Required: true, MaxLength: 600},
		}

	case "ticket_game_cs2":
		modalTitle = "CS2 Bewerbung"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "Steam Profile Link", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Rang", Style: discordgo.TextInputShort, CustomID: "field_four", Required: true},
		}

	case "ticket_game_valorant":
		modalTitle = "Valorant Bewerbung"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "InGame Name", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "Tracker Link", Style: discordgo.TextInputShort, CustomID: "field_four", Required: true},
		}

	case "ticket_game_rocket_league":
		modalTitle = "Rocket League Bewerbung"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "InGame Name", Style: discordgo.TextInputShort, CustomID: "field_three", Required: true},
			{Label: "RL Tracker Network Link", Style: discordgo.TextInputShort, CustomID: "field_four", Required: true},
			{Label: "Wunsch Elo", Style: discordgo.TextInputShort, CustomID: "field_five", Required: true},
		}

	case "ticket_game_sonstige":
		modalTitle = "Sonstige Bewerbungen"
		fields = []discordgo.TextInput{
			{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one", Required: true},
			{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
			{Label: "Bitte erkläre kurz für was du dich bewirbst", Style: discordgo.TextInputParagraph, CustomID: "field_three", Required: true, MaxLength: 400},
		}

		// already in code as possible option in future, but not used yet
		// case "ticket_game_splatoon":
		// 	modalTitle = "Rocket League Bewerbung"
		// 	fields = []discordgo.TextInput{
		//		{Label: "Vorname", Style: discordgo.TextInputShort, CustomID: "field_one"},
		//		{Label: "Alter", Style: discordgo.TextInputShort, CustomID: "field_two", Required: false},
		// 		{Label: "NOCH NICHT DEFINIERT", Style: discordgo.TextInputShort, CustomID: "field_three"}, // Noch nicht Definiert
		// 	}
	}

	if len(fields) == 0 {
		log.Println("Fehler: Keine Felder für das Modal definiert.")
		return
	}

	var components []discordgo.MessageComponent
	for _, field := range fields {
		components = append(components, discordgo.ActionsRow{Components: []discordgo.MessageComponent{&field}})
	}

	// Modal anzeigen
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID:   customID,
			Title:      modalTitle,
			Components: components,
		},
	})

	if err != nil {
		log.Println("Fehler beim Anzeigen des Modals:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleTicketSubmit(s *discordgo.Session, i *discordgo.InteractionCreate) {
	var err error

	// Direkte Response an die Interaktion senden mit einem "Thinking" Status
	err = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Flags: discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		log.Println("Fehler beim Senden der Thinking Response:", err)
		return
	}

	// Modal-Daten sammeln 
	data := i.ModalSubmitData()
	customID := i.ModalSubmitData().CustomID
	// log.Println("CustomID:", customID)

	var fields []string

	// Iteriere durch die Komponenten des Modals
	for _, component := range data.Components {
		if row, ok := component.(*discordgo.ActionsRow); ok {
			for _, item := range row.Components {
				if input, ok := item.(*discordgo.TextInput); ok {
					fields = append(fields, input.Value) // Wert speichern
					// log.Printf("Label: %s, Value: %s\n", input.Label, input.Value) // Optional: Logge Label und Wert
				}
			}
		}
	}

	// Zugriff auf die Variablen

	var labels = getLabelsForTicket(customID)

	if len(labels) == 0 {
		log.Println("Fehler: Keine Labels für das Ticket definiert.")
		return
	}

	if len(fields) == 0 {
		log.Println("Fehler: Keine Felder für das Ticket definiert.")
		return
	}

	var labelOne, fieldOne string
	var labelTwo, fieldTwo string
	var labelThree, fieldThree string
	var labelFour, fieldFour string
	var labelFive, fieldFive string

	if len(fields) > 0 {
		labelOne, fieldOne = labels[0], fields[0]
	}
	if len(labels) > 1 && len(fields) > 1 {
		labelTwo, fieldTwo = labels[1], fields[1]
	}
	if len(labels) > 2 && len(fields) > 2 {
		labelThree, fieldThree = labels[2], fields[2]
	}
	if len(labels) > 3 && len(fields) > 3 {
		labelFour, fieldFour = labels[3], fields[3]
	}
	if len(labels) > 4 && len(fields) > 4 {
		labelFive, fieldFive = labels[4], fields[4]
	}

	// categoryID aus Liste ziehen
	categoryID := getCategoryIDForTicket(customID)
	roleID := getRoleIDForTicket(customID)
	ticketArea := getTicketAreaForTicket(customID)

	// Datenbankeintrag erstellen

	_, err = database.DB.Exec(`
		INSERT INTO tickets (ticket_status, ticket_bereich, ticket_ersteller_id, ticket_ersteller_name, ticket_erstellungszeit, ticket_modal_field_one, ticket_modal_field_two, ticket_modal_field_three, ticket_modal_field_four, ticket_modal_field_five)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"Open", customID, i.Member.User.ID, i.Member.User.Username, time.Now().Unix(), fieldOne, fieldTwo, fieldThree, fieldFour, fieldFive)
	if err != nil {
		log.Println("Fehler beim Erstellen des Ticket-Eintrags:", err)
		return
	}

	// Ticket-ID abrufen
	var ticketID int64
	err = database.DB.QueryRow(`SELECT last_insert_rowid()`).Scan(&ticketID)
	if err != nil {
		log.Println("Fehler beim Abrufen der Ticket-ID:", err)
		return
	}

	// Neuen Channel erstellen
	channel, err := s.GuildChannelCreateComplex(i.GuildID, discordgo.GuildChannelCreateData{
		Name:     fmt.Sprintf("%d-open-%s", ticketID, i.Member.User.Username),
		Type:     discordgo.ChannelTypeGuildText,
		Topic:    fmt.Sprintf("Ticket #%d - Status: Open - Ticket von <@%s>", ticketID, i.Member.User.ID),
		ParentID: categoryID,
	})
	if err != nil {
		log.Println("Fehler beim Erstellen des Channels:", err)
		return
	}

	// Berechtigungen dass User Channel sehen kann setzten
	addUserChannelPermission(s, channel.ID, i.Member.User.ID)

	// Ticket-Channel-ID in Datenbank aktualisieren
	_, err = database.DB.Exec(`UPDATE tickets SET ticket_channel_id = ? WHERE ticket_id = ?`, channel.ID, ticketID)
	if err != nil {
		log.Println("Fehler beim Aktualisieren der Ticket-Channel-ID:", err)
		return
	}

	// embed_ticket_channel erstellen
	embed_ticket_channel := &discordgo.MessageEmbed{
		Title:       ticketArea,
		Description: "Details des Tickets:",
		Fields: []*discordgo.MessageEmbedField{
			{Name: labelOne, Value: fieldOne, Inline: false},
			{Name: labelTwo, Value: fieldTwo, Inline: false},
			{Name: labelThree, Value: fieldThree, Inline: false},
			{Name: labelFour, Value: fieldFour, Inline: false},
			{Name: labelFive, Value: fieldFive, Inline: false},
		},
		Color: 0xff0000, // Rot
	}
	userID := os.Getenv("ROLE_TICKET_PROTEAMS")

	var mention string
	if customID == "ticket_pro_teams" {
		mention = fmt.Sprintf("<@%s>", userID)
	} else {
		mention = fmt.Sprintf("<@&%s>", roleID)
	}

	message, err := s.ChannelMessageSendComplex(channel.ID, &discordgo.MessageSend{
		Content: mention,
		Embeds:  []*discordgo.MessageEmbed{embed_ticket_channel},
	})
	if err != nil {
		log.Println("Fehler beim Senden der Nachricht:", err)
		return
	}

	// Nachricht anpinnen
	err = s.ChannelMessagePin(channel.ID, message.ID)
	if err != nil {
		log.Println("Fehler beim Anpinnen der Nachricht:", err)
		return
	}

	// Moderationsansicht senden
	SendModerationView(s, channel.ID, int(ticketID), i.Member.User.Username)

	// Kanal mit Bestätigungsnachricht versehen
	embed := &discordgo.MessageEmbed{
		Title:       "Ticket erstellt",
		Description: fmt.Sprintf("Ein Moderator wird sich in Kürze um dein Anliegen kümmern.\n\n<#%s>", channel.ID),
		Color:       0x3498DB,
	}

	// InteractionResponse
	embeds := []*discordgo.MessageEmbed{embed}
	_, err = s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Embeds: &embeds,
	})
	if err != nil {
		log.Println("Fehler beim Bearbeiten der Interaction Response:", err)
		return
	}

	// Code für die Umfrage-DM
	// Prüfe, ob der User die Umfrage bereits beantwortet hat
	var surveyCount int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM survey_answers WHERE user_id = ?", i.Member.User.ID).Scan(&surveyCount)
	if err != nil {
		log.Println("Fehler beim Prüfen der Umfrageantwort:", err)
	} else if surveyCount == 0 {
		// Erstelle einen DM-Kanal zum User
		dmChannel, err := s.UserChannelCreate(i.Member.User.ID)
		if err != nil {
			// Falls der Benutzer DMs deaktiviert hat, nur eine kurze Info loggen
			if strings.Contains(strings.ToLower(err.Error()), "cannot send messages to this user") {
				log.Println("DMs sind für diesen Benutzer deaktiviert.")
			} else {
				log.Println("Fehler beim Erstellen eines DM-Kanals:", err)
			}
		} else {
			// Erstelle die Dropdown-Komponente für die Umfrage
			dmComponents := []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						&discordgo.SelectMenu{
							CustomID:    "ticket_after_survey_dropdown",
							Placeholder: "Woher kennst du uns?",
							Options: []discordgo.SelectMenuOption{
								{Label: "Discord", Value: "discord"},
								{Label: "Gamertransfer", Value: "gamertransfer"},
								{Label: "Social Media", Value: "social_media"},
								{Label: "Empfehlung von Freunden", Value: "friends"},
								{Label: "Sonstige", Value: "other"},
							},
						},
					},
				},
			}

			embed := &discordgo.MessageEmbed{
				Title:       "Kurze Umfrage",
				Description: "Bitte teile uns kurz mit, woher du uns kennst. Dies hilft uns dabei, unsere Reichweite besser zu verstehen.",
				Color:       0x3498DB,
			}

			// Sende die Umfrage als DM
			_, err = s.ChannelMessageSendComplex(dmChannel.ID, &discordgo.MessageSend{
				Embeds:     []*discordgo.MessageEmbed{embed},
				Components: dmComponents,
			})
			if err != nil {
				if strings.Contains(strings.ToLower(err.Error()), "cannot send messages to this user") {
					log.Println("DMs sind für diesen Benutzer deaktiviert.")
				} else {
					log.Println("Fehler beim Senden der Umfrage DM:", err)
				}
			}
		}
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/
