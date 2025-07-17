package tickets

import (
	"fmt"
	"time"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleCloseButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	ticketID, err := GetTicketIDFromInteraction(bot, bot_interaction)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_close.go", true, err, "Fehler beim Abrufen der Ticket-ID aus der Interaktion")
		return
	}
	ticket_db_info := getTicketDbInfo(bot, ticketID)

	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_status = "Closed", ticket_schliesser_id = ?, ticket_schliesser_name = ?, ticket_schliesszeit = ?
		WHERE ticket_id = ?`,
		bot_interaction.Member.User.ID, bot_interaction.Member.User.Username, time.Now().Unix(), ticketID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_close.go", true, err, "Fehler beim Aktualisieren des Tickets in der Datenbank")
		return
	}

	bot.ChannelEdit(bot_interaction.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-closed-%s-%s", ticketID, ticket_db_info[5], ticket_db_info[8]),
		Topic: fmt.Sprintf("Ticket #%d - Status: Closed - Ticket von <@%s> - Ticket Bearbeiter <@%s> - Ticket geschlossen von <@%s>", ticketID, ticket_db_info[4], ticket_db_info[7], bot_interaction.Member.User.ID),
	})

	removeUserChannelPermission(bot, bot_interaction.ChannelID, ticket_db_info[4])

	_, err = bot.ChannelMessageSend(bot_interaction.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geschlossen.", ticketID, bot_interaction.Member.User.ID))
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_close.go", true, err, "Fehler beim Senden der Benachrichtigung über den User der das Ticket geschlossen hat in Ticket #" + fmt.Sprint(ticketID))
	}

	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Closed", Inline: true},
		},
		Color: 0xFFD700, // Gold
	}

	updatedComponents := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Claim", CustomID: "ticket_button_claim", Disabled: true},
				&discordgo.Button{Style: discordgo.SecondaryButton, Label: "Reopen", CustomID: "ticket_button_reopen"},
				&discordgo.Button{Style: discordgo.PrimaryButton, Label: "Assign", CustomID: "ticket_button_assign", Disabled: true},
				&discordgo.Button{Style: discordgo.DangerButton, Label: "Delete", CustomID: "ticket_button_delete"},
			},
		},
	}

	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseUpdateMessage,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Components: updatedComponents,
		},
	})
}

/*--------------------------------------------------------------------------------------------------------------------------*/
