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
	case "introduce_diamond_club":
		reply = fmt.Sprintf(
			"vielen Dank für deine Bewerbung!\n\n" +
				"Ich würde dir gerne den Entropy Diamond Club <:DiamondClub:1229333849578799175> vorstellen.\n\n" +
				"Der Diamond Club :DiamondClub: ist essentiell der Community Bereich von Entropy Gaming <:Entropy2:1225559069167980634>\n\n" +
				"Das bedeutet, dass du die Möglichkeit hast:\n" +
				"Zahlreiche neue Mitspieler zu finden\n" +
				"Einem festen Team beizutreten, mit welchem du Ligen und Turniere bestreiten kannst\n" +
				"Von den Zahlreichen Rabatten auf Bootcamps und Produkten unserer Partner zu profitieren\n" +
				"Bei unseren Online und Offline Community-Events mitzumachen\n\n" +
				"Das ganze natürlich vollkommen kostenfrei!\n\n" +
				"Wie klingt das für dich?\n" +
				"<:Entropy2:1225559069167980634> <:DiamondClub:1229333849578799175>")

	case "send_form":
		reply = fmt.Sprintf(
			"Alles klar!\n" +
				"Dann würde ich dich einmal Bitten dieses Formular auszufüllen:\n" +
				"https://docs.google.com/forms/d/e/1FAIpQLScpklvRjqT_DJATEH__OwNCVdkMD6TXqiU3SJnSlrOByzHdCw/viewform\n" +
				"Dabei ist zu beachten, das nur die mit einem Stern markierten Angaben wirklich wichtig sind, den Rest kannst du gerne weglassen wenn du magst. Wenn du fertig bist gib mir hier im Ticket bescheid.\n" +
				"<:Entropy2:1225559069167980634> <:DiamondClub:1229333849578799175>")
				
	case "pro_not_eligible":
		reply = fmt.Sprintf(
			"Hi [@EINFÜGEN],\n\n" +
				"vielen Dank für deine Bewerbung!\n\n" +
				"Ich kann dir zwar derzeit keinen Platz in unserem Pro-Team anbieten, " +
				"ich würde dir aber sehr gerne in einem kurzen Gespräch den Entropy Diamond Club vorstellen.\n\n" +
				"Ich bin überzeugt, dass du super zu unserer Community passen würdest.\n\n" +
				"Du findest im Diamond Club zahlreiche neue Mitspieler, hast die Möglichkeit, " +
				"einem festen Team beizutreten und in Ligen und Turnieren zu spielen, " +
				"erhältst dazu noch Rabatte auf Bootcamps und Produkte unserer Partner und " +
				"kannst bei unseren online und offline Community-Events mitmachen.\n\n" +
				"Das Ganze natürlich völlig kostenfrei. Wie klingt das für dich? 🙂")

	case "not_applied_pro":
		reply = fmt.Sprintf(
			"Hi [@EINFÜGEN],\n\n" +
				"vielen Dank für deine Bewerbung!\n\n" +
				"Ich würde dir sehr gerne in einem kurzen Gespräch den Entropy Diamond Club vorstellen.\n\n" +
				"Ich bin überzeugt, dass du super zu unserer Community passen würdest.\n\n" +
				"Du findest im Diamond Club zahlreiche neue Mitspieler, hast die Möglichkeit, " +
				"einem festen Team beizutreten und in Ligen und Turnieren zu spielen, " +
				"erhältst dazu noch Rabatte auf Bootcamps und Produkte unserer Partner und " +
				"kannst bei unseren online und offline Community-Events mitmachen.\n\n" +
				"Das Ganze natürlich völlig kostenfrei. Wie klingt das für dich? 🙂")
		}
	

	bot.InteractionRespond(bot_interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: reply,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}
