package tickets

import (
	"fmt"
	"time"
	"strconv"

	"bot/database"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func HandleClaimButton(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	ticketID, err := GetTicketIDFromInteraction(bot, bot_interaction)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_claim.go", true, err, "Fehler beim Abrufen der Ticket-ID aus der Interaktion")
		return
	}
	ticket_db_info := getTicketDbInfo(bot, ticketID)

	_, err = database.DB.Exec(`
		UPDATE tickets 
		SET ticket_bearbeiter_id = ?, ticket_bearbeiter_name = ?, ticket_bearbeitungszeit = ?, ticket_status = "Claimed"
		WHERE ticket_id = ?`,
		bot_interaction.Member.User.ID, bot_interaction.Member.User.Username, time.Now().Unix(), ticketID)

	if err != nil {
		utils.LogAndNotifyAdmins(bot, "high", "Error", "mod_claim.go", true, err, "Fehler beim Aktualisieren des Tickets in der Datenbank")
		return
	}

	bot.ChannelEdit(bot_interaction.ChannelID, &discordgo.ChannelEdit{
		Name: fmt.Sprintf("%d-claimed-%s-%s", ticketID, ticket_db_info[5], bot_interaction.Member.User.Username),
		Topic: fmt.Sprintf("Ticket #%d - Status: Claimed - Ticket von <@%s> - Ticket Bearbeiter <@%s>", ticketID, ticket_db_info[4], bot_interaction.Member.User.ID),
	})

	// Nachricht senden, um den Benutzer über den neuen Status zu informieren
	_, err = bot.ChannelMessageSend(bot_interaction.ChannelID, fmt.Sprintf("Das Ticket #%d wurde von <@%s> geclaimt.", ticketID, bot_interaction.Member.User.ID))
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "mod_claim.go", true, err, "Fehler beim Senden der Benachrichtigung über den User der das Ticket geclaimt hat in Ticket #" + strconv.Itoa(ticketID))
	}

	// Embed aktualisieren
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Ticket #%d Moderation", ticketID),
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Erstellt von", Value: ticket_db_info[5], Inline: true},
			{Name: "Status", Value: "Claim", Inline: true},
		},
		Color: 0xFFD700, // Goldfarbe
	}

	// Buttons aktualisieren (Claim und Assign deaktivieren)
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
