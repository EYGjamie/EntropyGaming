package discord_administration

import (
	"fmt"
	"os"

	"github.com/bwmarrin/discordgo"
)

// HandleTicketResponse liefert eine Standardantwort für Ticket-Bewerbungen
func HandleTicketResponse(s *discordgo.Session, i *discordgo.InteractionCreate) {
	permRole := os.Getenv("ROLE_MANAGEMENT")
	allowed := false
	for _, r := range i.Member.Roles {
		if r == permRole {
			allowed = true
		}
	}
	if !allowed {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{Content: "Du hast keine Berechtigung.", Flags: discordgo.MessageFlagsEphemeral},
		})
		return
	}

	data := i.ApplicationCommandData()
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

	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: reply, 
			Flags: discordgo.MessageFlagsEphemeral,
		},
	})
}
