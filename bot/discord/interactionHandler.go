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
func interactionHandler(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) {

	// Switch for Type of Interaction
	switch bot_interaction.Type {

	/*==================================================================*/
	// "Interaction-ApplicationCommand" (Slash Command)
	/*==================================================================*/

	case discordgo.InteractionApplicationCommand:
		switch bot_interaction.ApplicationCommandData().Name {
			case "ticket_view":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleDeveloper) {tickets.HandleTicketView(bot, bot_interaction)}
			case "ticket_response":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {discord_administration_utils.HandleTicketResponse(bot, bot_interaction)}
			case "create_team_area":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {discord_administration_team_areas.HandleCreateTeamArea(bot, bot_interaction)}
			case "delete_team_area":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {discord_administration_team_areas.HandleDeleteTeamArea(bot, bot_interaction)}
			case "music":
				utils.EnsureUser(bot, bot_interaction.Member.User.ID)
				discord_administration_utils.HandleMusic(bot, bot_interaction)
			case "cplist":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleDeveloper) {discord_administration_utils.HandleCPList(bot, bot_interaction)}
			case "quiz_role":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleDeveloper) {quiz.HandleQuizCommand(bot, bot_interaction)}
			case "send_survey":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleProjektleitung) {surveys.SendSurvey(bot, bot_interaction, database.DB)}
			default:
				utils.LogAndNotifyAdmins(bot, "warn", "Warnung", "interactionHandler.go", true, nil, "unknown Slash Command: " + bot_interaction.ApplicationCommandData().Name)
				return
			}
	
	/*==================================================================*/
	// "Interaction-MessageComponent" (Button, Dropdown, etc.)
	/*==================================================================*/

	case discordgo.InteractionMessageComponent:
		switch bot_interaction.MessageComponentData().CustomID {

			// Ticket Creation Process
			case "ticket_create_ticket":
				utils.EnsureUser(bot, bot_interaction.Member.User.ID)
				tickets.HandleCreateTicket(bot, bot_interaction)
			case "ticket_dropdown":
				// Blacklist Check
				tickets.HandleTicketDropdown(bot, bot_interaction)
			case "ticket_game_dropdown":
				tickets.HandleGameDropdown(bot, bot_interaction)
			// After Ticket Creation Survey Dropdown via DM
			case "ticket_after_survey_dropdown":
				surveys.HandleSurveyDropdown(bot, bot_interaction)
			// Ticket Moderation Buttons
			case "ticket_button_claim":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {tickets.HandleClaimButton(bot, bot_interaction)}
			case "ticket_button_close":
				utils.EnsureUser(bot, bot_interaction.Member.User.ID)
				tickets.HandleCloseButton(bot, bot_interaction)
			case "ticket_button_reopen":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {tickets.HandleReopenButton(bot, bot_interaction)}
			case "ticket_button_delete":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {tickets.HandleDeleteButton(bot, bot_interaction)}
			case "ticket_button_assign":
				if utils.CheckUserPermissions(bot, bot_interaction, utils.RequireRoleManagement) {tickets.HandleAssignButton(bot, bot_interaction)}
			case "ticket_confirm_delete_ticket":
				tickets.HandleConfirmDelete(bot, bot_interaction)
			case "ticket_cancel_delete_ticket":
				tickets.HandleCancelDelete(bot, bot_interaction)

			// Quiz Ping Role Button
			case "quiz_get_role":
				utils.EnsureUser(bot, bot_interaction.Member.User.ID)
				quiz.HandleQuizButton(bot, bot_interaction)
				
			default:
				// Survey Interaction handler
				if strings.HasPrefix(bot_interaction.MessageComponentData().CustomID, "survey_") {
					surveys.HandleSurveyInteraction(bot, bot_interaction, database.DB)
					return
					}

				// Assign Ticket Dropdown handling
				if strings.HasPrefix(bot_interaction.MessageComponentData().CustomID, "ticket_assign_ticket_dropdown_") {
					tickets.HandleAssignTicketUpdate(bot, bot_interaction, bot_interaction.MessageComponentData().CustomID)
					return
					}

				// Assign Suggestions Dropdown handling
				if strings.HasPrefix(bot_interaction.MessageComponentData().CustomID, "ticket_assign_suggestions_") {
					tickets.HandleAssignSuggestions(bot, bot_interaction, bot_interaction.MessageComponentData().CustomID)
					return
				}

				// Quiz Answer Select handling
				if strings.HasPrefix(bot_interaction.MessageComponentData().CustomID, "quiz_answer_") {
					quiz.HandleAnswerSelect(bot, bot_interaction)
					return
					}

				utils.LogAndNotifyAdmins(bot, "warn", "Warnung", "interactionHandler.go", true, nil, "unknown CustomID in MessageComponent: " + bot_interaction.MessageComponentData().CustomID)
				return
			}

	/*==================================================================*/
	// "Interaction-ModalSubmit" (Modal-Submit)
	/*==================================================================*/

	case discordgo.InteractionModalSubmit:
		switch bot_interaction.ModalSubmitData().CustomID {

			// DM Survey-Modal
			case "ticket_after_survey_modal":
				surveys.HandleSurveyModalSubmit(bot, bot_interaction)

			// default in this case: Ticket-Submit Modal
			// Überarbeitung nötig, da der default-Case eigentlich eine Fehlermeldung sein sollte, wenn die CustomID nicht existiert
			default:
				// Assign Ticket Modal handling
				if strings.HasPrefix(bot_interaction.ModalSubmitData().CustomID, "ticket_assign_modal_") {
					tickets.HandleAssignModal(bot, bot_interaction)
					return
				}

				log.Printf("Test Ticket Creation Custom ID %s", bot_interaction.ModalSubmitData().CustomID)
				utils.EnsureUser(bot, bot_interaction.Member.User.ID)
				tickets.HandleTicketSubmit(bot, bot_interaction) // Anderes Modal -> Ticket-Submit
			}
	}
}