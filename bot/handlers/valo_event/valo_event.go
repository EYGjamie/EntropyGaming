package valo_event

import (
	"bot/database"
	"bot/utils"
	"database/sql"
	"fmt"
	"time"

	"github.com/bwmarrin/discordgo"
)

// HandleValoEventCommand erstellt das Embed mit dem Registrierungs-Button
func HandleValoEventCommand(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	embed := &discordgo.MessageEmbed{
		Title:       "🎮 Valorant Event Anmeldung",
		Description: "Melde dich für das kommende Valorant Event an!\n\nKlicke auf den Button unten und gib deinen Valorant-Namen ein.",
		Color:       0xFF4454,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "📅 Event Details",
				Value:  "Weitere Informationen folgen bald!",
				Inline: false,
			},
			{
				Name:   "🎯 Was benötigt wird",
				Value:  "• Dein Valorant Username\n• Bereitschaft zum Spielen\n• Discord für Kommunikation",
				Inline: false,
			},
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Klicke den Button unten für die Anmeldung",
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}

	button := &discordgo.Button{
		Label:    "📝 Anmelden",
		Style:    discordgo.PrimaryButton,
		CustomID: "valo_event_register",
		Emoji: &discordgo.ComponentEmoji{
			Name: "🎮",
		},
	}

	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{button},
		},
	}

	err := bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: components,
		},
	})

	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim Senden des Valo Event Embeds")
	}
}

// HandleValoEventButton wird aufgerufen wenn der Registrierungs-Button geklickt wird
func HandleValoEventButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	userID, err := utils.EnsureUser(bot, bot_interaction.Member.User.ID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim EnsureUser für Valo Event Registrierung")
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Prüfen ob bereits registriert
	var existingRegistration int
	err = database.DB.QueryRow("SELECT id FROM valo_event_registrations WHERE user_id = ?", userID).Scan(&existingRegistration)
	if err != nil && err != sql.ErrNoRows {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim Prüfen der bestehenden Valo Event Registrierung")
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Wenn bereits registriert
	if err == nil {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "⚠️ Du bist bereits für das Valorant Event registriert!",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Modal für Valorant Namen anzeigen
	modal := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseModal,
		Data: &discordgo.InteractionResponseData{
			CustomID: "valo_event_modal",
			Title:    "Valorant Event Anmeldung",
			Components: []discordgo.MessageComponent{
				discordgo.ActionsRow{
					Components: []discordgo.MessageComponent{
						discordgo.TextInput{
							CustomID:    "valorant_name",
							Label:       "Dein Valorant Username",
							Style:       discordgo.TextInputShort,
							Placeholder: "z.B. PlayerName#1234",
							Required:    true,
						},
					},
				},
			},
		},
	}

	err = bot.InteractionRespond(bot_interaction.Interaction, modal)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim Anzeigen des Valo Event Modals")
	}
}

// HandleValoEventModal verarbeitet die Modal-Einreichung
func HandleValoEventModal(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	// Valorant Namen aus dem Modal extrahieren
	modalData := bot_interaction.ModalSubmitData()
	var valorantName string
	
	for _, component := range modalData.Components {
		if actionRow, ok := component.(*discordgo.ActionsRow); ok {
			for _, comp := range actionRow.Components {
				if textInput, ok := comp.(*discordgo.TextInput); ok && textInput.CustomID == "valorant_name" {
					valorantName = textInput.Value
					break
				}
			}
		}
	}

	if valorantName == "" {
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Bitte gib einen gültigen Valorant-Namen ein.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// User sicherstellen
	userID, err := utils.EnsureUser(bot, bot_interaction.Member.User.ID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim EnsureUser für Valo Event Modal")
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Discord Username ermitteln
	discordUsername := bot_interaction.Member.User.Username
	if bot_interaction.Member.Nick != "" {
		discordUsername = bot_interaction.Member.Nick
	}

	// In Datenbank speichern
	_, err = database.DB.Exec(`
		INSERT INTO valo_event_registrations (user_id, discord_username, valorant_name, registered_at) 
		VALUES (?, ?, ?, ?)
	`, userID, discordUsername, valorantName, time.Now())
	
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "valo_event.go", true, err, "Fehler beim Speichern der Valo Event Registrierung")
		bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}

	// Rolle vergeben
	// valoEventRoleID := utils.GetIdFromDB(bot, "ROLE_VALO_EVENT")
	// if valoEventRoleID != "" {
	// 	err = bot.GuildMemberRoleAdd(bot_interaction.GuildID, bot_interaction.Member.User.ID, valoEventRoleID)
	// 	if err != nil {
	// 		utils.LogAndNotifyAdmins(bot, "medium", "Error", "valo_event.go", true, err, "Fehler beim Vergeben der Valo Event Rolle")
	// 	}
	// }

	// Erfolgreiche Anmeldung bestätigen
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("✅ **Erfolgreich angemeldet!**\n\n🎮 **Valorant Name:** %s\n🎉 Du hast die Event-Rolle erhalten und wirst über weitere Details informiert!", valorantName),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})

	// Admin-Benachrichtigung über neue Anmeldung
	utils.LogAndNotifyAdmins(bot, "info", "Info", "valo_event.go", false, nil, 
		fmt.Sprintf("Neue Valo Event Anmeldung: %s (%s) - Valorant: %s", 
			discordUsername, bot_interaction.Member.User.ID, valorantName))
}