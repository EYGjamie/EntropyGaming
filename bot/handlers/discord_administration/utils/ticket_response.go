package discord_administration_utils

import (
	"fmt"

	"github.com/bwmarrin/discordgo"
)

// HandleTicketResponse liefert eine Standardantwort für Ticket-Bewerbungen
func HandleTicketResponse(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {
	data := bot_interaction.ApplicationCommandData()
	variant := data.Options[0].StringValue()

	var reply string
	switch variant {
	case "pro_not_eligible":
		reply = fmt.Sprintf(
			"Hi [@EINFÜGEN],\n\n"+
			"vielen Dank für deine Bewerbung!\n\n"+
			"Ich kann dir zwar derzeit keinen Platz in unserem Pro-Team anbieten, "+
			"ich würde dir aber sehr gerne in einem kurzen Gespräch den Entropy Diamond Club vorstellen.\n\n"+
			"Ich bin überzeugt, dass du super zu unserer Community passen würdest.\n\n"+
			"Du findest im Diamond Club zahlreiche neue Mitspieler, hast die Möglichkeit, "+
			"einem festen Team beizutreten und in Ligen und Turnieren zu spielen, "+
			"erhältst dazu noch Rabatte auf Bootcamps und Produkte unserer Partner und "+
			"kannst bei unseren online und offline Community-Events mitmachen.\n\n"+
			"Das Ganze natürlich völlig kostenfrei. Wie klingt das für dich? 🙂")

	case "not_applied_pro":
		reply = fmt.Sprintf(
			"Hi [@EINFÜGEN],\n\n"+
			"vielen Dank für deine Bewerbung!\n\n"+
			"Ich würde dir sehr gerne in einem kurzen Gespräch den Entropy Diamond Club vorstellen.\n\n"+
			"Ich bin überzeugt, dass du super zu unserer Community passen würdest.\n\n"+
			"Du findest im Diamond Club zahlreiche neue Mitspieler, hast die Möglichkeit, "+
			"einem festen Team beizutreten und in Ligen und Turnieren zu spielen, "+
			"erhältst dazu noch Rabatte auf Bootcamps und Produkte unserer Partner und "+
			"kannst bei unseren online und offline Community-Events mitmachen.\n\n"+
			"Das Ganze natürlich völlig kostenfrei. Wie klingt das für dich? 🙂")
	}

	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: reply, 
			Flags: discordgo.MessageFlagsEphemeral,
		},
	})
}
