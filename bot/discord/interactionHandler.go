package discord

import (
	"log"
	"strings"
	"bot/database"
	"bot/utils"
	"bot/handlers/surveys"
	"bot/handlers/tickets"
	"bot/handlers/discord_administration/team_areas"
	"bot/handlers/discord_administration/utils"
	"bot/handlers/quiz"

	"github.com/bwmarrin/discordgo"
)

// Interaction Handler
func interactionHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {

	// Switch for Type of Interaction
	switch i.Type {

	/*==================================================================*/
	// "Interaction-ApplicationCommand" (Slash Command)
	/*==================================================================*/

	case discordgo.InteractionApplicationCommand:
		switch i.ApplicationCommandData().Name {
			case "ticket_view":
				tickets.HandleTicketView(s, i)
			case "ticket_response":
				discord_administration_utils.HandleTicketResponse(s, i)
			case "create_team_area":
				discord_administration_team_areas.HandleCreateTeamArea(s, i)
			case "delete_team_area":
				discord_administration_team_areas.HandleDeleteTeamArea(s, i)
			case "music":
				discord_administration_utils.HandleMusic(s, i)
			case "cplist":
				discord_administration_utils.HandleCPList(s, i)
			case "quiz_role":
				quiz.HandleQuizCommand(s, i)
			case "send_survey":
				surveys.SendSurvey(s, i, database.DB)
			default:
				utils.LogAndNotifyAdmins(s, "warn", "Warnung", "interactionHandler.go", true, nil, "unknown Slash Command: "+i.ApplicationCommandData().Name)
				return
			}
	
	/*==================================================================*/
	// "Interaction-MessageComponent" (Button, Dropdown, etc.)
	/*==================================================================*/

	case discordgo.InteractionMessageComponent:
		switch i.MessageComponentData().CustomID {

			// Ticket Creation Process
			case "ticket_create_ticket":
				tickets.HandleCreateTicket(s, i) // Button "Create Ticket"
			case "ticket_dropdown":
				tickets.HandleTicketDropdown(s, i) // Dropdown first selection
			case "ticket_game_dropdown":
				tickets.HandleGameDropdown(s, i) // Dropdown game selection

			// After Ticket Creation Survey Dropdown via DM
			case "ticket_after_survey_dropdown":
				surveys.HandleSurveyDropdown(s, i)

			// Ticket Moderation Buttons
			case "ticket_button_claim":
				tickets.HandleClaimButton(s, i)
			case "ticket_button_close":
				tickets.HandleCloseButton(s, i)
			case "ticket_button_reopen":
				tickets.HandleReopenButton(s, i)
			case "ticket_button_delete":
				tickets.HandleDeleteButton(s, i)
			case "ticket_button_assign":
				tickets.HandleAssignButton(s, i)
			case "ticket_confirm_delete_ticket":
				tickets.HandleConfirmDelete(s, i)
			case "ticket_cancel_delete_ticket":
				tickets.HandleCancelDelete(s, i)

			// Quiz Ping Role Button
			case "quiz_get_role":
				quiz.HandleQuizButton(s, i)
				
			default:
				// Survey Interaction handler
				if strings.HasPrefix(i.MessageComponentData().CustomID, "survey_") {
					surveys.HandleSurveyInteraction(s, i, database.DB)
					return
					}

				// Assign Ticket Dropdown handling
				if strings.HasPrefix(i.MessageComponentData().CustomID, "ticket_assign_ticket_dropdown_") {
					tickets.HandleAssignTicketUpdate(s, i, i.MessageComponentData().CustomID)
					return
					}

				// Quiz Answer Select handling
				if strings.HasPrefix(i.MessageComponentData().CustomID, "quiz_answer_") {
					quiz.HandleAnswerSelect(s, i)
					return
					}

				utils.LogAndNotifyAdmins(s, "warn", "Warnung", "interactionHandler.go", true, nil, "unknown CustomID in MessageComponent: "+i.MessageComponentData().CustomID)
				return
			}

	/*==================================================================*/
	// "Interaction-ModalSubmit" (Modal-Submit)
	/*==================================================================*/

	case discordgo.InteractionModalSubmit:
		switch i.ModalSubmitData().CustomID {

			// DM Survey-Modal
			case "ticket_after_survey_modal":
				surveys.HandleSurveyModalSubmit(s, i)

			// default in this case: Ticket-Submit Modal
			// Überarbeitung nötig, da der default-Case eigentlich eine Fehlermeldung sein sollte, wenn die CustomID nicht existiert
			default:
				log.Printf("Test Ticket Creation Custom ID %s", i.ModalSubmitData().CustomID)
				tickets.HandleTicketSubmit(s, i) // Anderes Modal -> Ticket-Submit
			}
	}
}