package tickets

import (
	"fmt"
	"time"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleReopenButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	ticketID, err := GetTicketIDFromInteraction(bot, bot_interaction)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_reopen.go", true, err, "Fehler beim Abrufen der Ticket-ID aus der Interaktion")
		return
	}

	// Ticket-Informationen aus der Datenbank abrufen
	ticket_db_info := getTicketDbInfo(bot, ticketID)

	// Status in der Datenbank aktualisieren
	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_status = "Claimed", ticket_schliesser_id = ?, ticket_schliesser_name = ?, ticket_schliesszeit = ?
		WHERE ticket_id = ?`,
		bot_interaction.Member.User.ID, bot_interaction.Member.User.Username, time.Now().Unix(), ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_reopen.go", true, err, "Fehler beim Aktualisieren des Tickets in der Datenbank")
		return
	}

	// Kanal aktualisieren
	_, err = bot.ChannelEdit(bot_interaction.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Reopen - Ticket von <@%s> - Ticket Bearbeiter <@%s> - Ticket geschlossen von <@%s> - Ticket erneut geöffnet von <@%s>", ticketID, ticket_db_info[4], ticket_db_info[7], ticket_db_info[10], bot_interaction.Member.User.ID),
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_reopen.go", true, err, "Fehler beim Aktualisieren des Kanalnamens in Ticket #" + fmt.Sprint(ticketID))
		return
	}

	// Berechtigungen erneut hinzufügen
	addUserChannelPermission(bot, bot_interaction.ChannelID, ticket_db_info[4])

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = bot.ChannelMessageSend(bot_interaction.ChannelID, fmt.Sprintf("<@%s> dein Ticket #%d wurde von <@%s> erneut geöffnet.", ticket_db_info[4], ticketID, bot_interaction.Member.User.ID))
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_reopen.go", true, err, "Fehler beim Senden der Benachrichtigung über den User der das Ticket erneut geöffnet hat in Ticket #" + fmt.Sprint(ticketID))
	}

	// Embed aktualisieren
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Reopened", Inline: true},
		},
		Color: 0xFFD700, // Goldfarbe
	}

	// Buttons aktualisieren (Claim und Assign deaktivieren, reopen statt close)
	updatedComponents := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Claim", CustomID: "ticket_button_claim", Disabled: true},
				&discordgo.Button{Style: discordgo.SecondaryButton, Label: "Close", CustomID: "ticket_button_close"},
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Assign", CustomID: "ticket_button_assign", Disabled: true},
				&discordgo.Button{Style: discordgo.DangerButton, Label: "Delete", CustomID: "ticket_button_delete"},
			},
		},
	}

	// Nachricht aktualisieren
	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Components: updatedComponents,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/