package discord

import (
	"log"
	"os"
	"strings"
	"bot/database"
	"bot/handlers/staffmember"
	"bot/handlers/surveys"
	"bot/handlers/tickets"
	"bot/handlers/discord_administration"
	"bot/handlers/tracking"
	"bot/handlers/quiz"
	"bot/handlers/weekly_updates"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func StartBot() error {
	// Discord-Bot-Token
	Token := os.Getenv("DISCORD_BOT_TOKEN")
	if Token == "" {
		log.Fatalf("Bot-Token nicht gefunden!")
	}

	// Tracking-Handler instanzieren
	inviteTracker := tracking.NewInviteTracker(database.DB)
	leaveTracker := tracking.NewLeaveTracker(database.DB)
	voiceTracker := tracking.NewVoiceTracker(database.DB)
	msgTracker := tracking.NewMessageTracker(database.DB)
	voiceVis := discord_administration.NewVoiceVisibilityTracker(database.DB)
	

	// Creation Discord-Session
	dg, err := discordgo.New("Bot " + Token)
	if err != nil {
		return err
	}

	// Register Bot-Intents
	dg.Identify.Intents = discordgo.IntentsAll

	// Register Event-Handler
	dg.AddHandler(ready)
	dg.AddHandler(interactionHandler)

	// Register Tracking-Handler
	dg.AddHandler(inviteTracker.OnReady)
	dg.AddHandler(inviteTracker.OnGuildMemberAdd)
	dg.AddHandler(leaveTracker.OnGuildMemberRemove)
	dg.AddHandler(voiceTracker.OnVoiceStateUpdate)
	dg.AddHandler(msgTracker.OnMessageCreate)
	
	// TimedPurger
	discord_administration.StartChannelPurger(dg)

	// Voice Visibility Tracker
	dg.AddHandler(voiceVis.OnVoiceStateUpdate)

	// Register Quiz Handler
	quiz.RegisterQuiz(dg)

	// Connection Discord-API
	err = dg.Open()
	if err != nil {
		return err
	}

	// Command register
	registerCommands(dg)

	// Weekly Updates Handler
	weeklyManager, err := weekly_updates.InitializeWeeklyUpdates(database.DB, dg)
	if err != nil {
		discord_administration.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 74, err, "Fehler beim Initialisieren der wöchentlichen Berichte")
	}

	// Test Weekly Updates Scheduler
	if os.Getenv("WEEKLY_GENERATE_REPORTS_NOW") == "true" {
		if err := weeklyManager.GenerateReportsNow(); err != nil {
			discord_administration.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 80, err, "Fehler beim TEST von Generieren der wöchentlichen Berichte")
		}
	}

	// Stauts-Update "Bot is online"
	log.Println("Bot has been started and successfully connected to Discord!")
	
	// Test:
	// discord_administration.LogAndNotifyAdmins(dg, "Keine", "Info", "bot.go", 77, nil, "Bot gestartet")

	select {}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// ready-Handler
func ready(s *discordgo.Session, event *discordgo.Ready) {
	staffmember.StartRoleUpdater(s, database.DB, os.Getenv("GUILD_ID"))           				// Starting Role-Updater for Database
	tickets.CheckAndNotifyInactiveUsers(s, database.DB, os.Getenv("GUILD_ID")) 					// Starting Inaktive-User-Notifier 
	// tickets.StartTicketStatusUpdater(s, database.DB, os.Getenv("CHANNEL_TICKET_STATUS_ID"))   	// Starting Ticket-Status-Updater
	log.Printf("Bot logged in as %s#%s", event.User.Username, event.User.Discriminator) 		// Stauts-Update "Bot is working"

	
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// Interaction Handler
func interactionHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {

	// Switch for Type of Interaction
	switch i.Type {

	// Interaction Type "Slash-Command"	
	case discordgo.InteractionApplicationCommand:
		switch i.ApplicationCommandData().Name {
		case "ticket_view":
			tickets.HandleTicketView(s, i)
		case "ticket_response":
			discord_administration.HandleTicketResponse(s, i)
		case "create_team_area":
			discord_administration.HandleCreateTeamArea(s, i)
		case "delete_team_area":
			discord_administration.HandleDeleteTeamArea(s, i)
		case "music":
			discord_administration.HandleMusic(s, i)
		case "cplist":
			discord_administration.HandleCPList(s, i)
		case "quiz_role":
			quiz.HandleQuizCommand(s, i)
		case "send_survey":
			surveys.SendSurvey(s, i, database.DB)
		}
	
	// Interaction Type "Interaction-MessageComponent" (Button, Dropdown, etc.)
	case discordgo.InteractionMessageComponent:

		// Swich by CustomID of Interaction
		switch i.MessageComponentData().CustomID {

		// Ticket Creation View
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
			tickets.HandleClaimButton(s, i) // Button "Claim"
		case "ticket_button_close":
			tickets.HandleCloseButton(s, i) // Button "Close"
		case "ticket_button_reopen":
			tickets.HandleReopenButton(s, i) // Button "Reopen"
		case "ticket_button_delete":
			tickets.HandleDeleteButton(s, i) // Button "Delete"
		case "ticket_button_assign":
			tickets.HandleAssignButton(s, i) // Button "Assign"
		case "ticket_confirm_delete_ticket":
			tickets.HandleConfirmDelete(s, i) // Button "Confirm" 
		case "ticket_cancel_delete_ticket":
			tickets.HandleCancelDelete(s, i) // Button "Cancel"

		// Quiz Role Button
		case "quiz_get_role":
			quiz.HandleQuizButton(s, i) // Button "Get Quiz Role"
			
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

			if strings.HasPrefix(i.MessageComponentData().CustomID, "quiz_answer_") {
				quiz.HandleAnswerSelect(s, i) // Quiz Answer Select
				return
				}

			// Default case for unknown CustomID
			log.Printf("Unbekannte CustomID in MessageComponent: %s", i.MessageComponentData().CustomID)
		}

	// Interaction Type "Interaction-ModalSubmit" (Modal-Submit)
	case discordgo.InteractionModalSubmit:

		// Swich by CustomID of Interaction
		switch i.ModalSubmitData().CustomID {

		// DM Survey-Modal
		case "ticket_after_survey_modal":
			surveys.HandleSurveyModalSubmit(s, i)

		// default in this case: Ticket-Submit Modal
		// Überarbeitung nötig, da der default-Case eigentlich eine Fehlermeldung sein sollte, wenn die CustomID nicht existiert
		default:
			tickets.HandleTicketSubmit(s, i) // Anderes Modal -> Ticket-Submit
		}
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// registerCommands: Register Slash Coammands in Discord
func registerCommands(s *discordgo.Session) {
	if s == nil {
		log.Fatal("Discord-Session ist nil! Command-Registrierung fehlgeschlagen.")
	}
	adminPerm := int64(discordgo.PermissionAdministrator)

	/*==============================================*/
	// COMMAND REGISTRATION
	/*==============================================*/

	commands := []*discordgo.ApplicationCommand{
		/*----------------------------------------------------------*/	

		// ticket_view Command (sends the ticket view with 'Create Ticket' button)
		{
			Name:                     "ticket_view",
			Description:              "Sendet das Ticket-View mit 'Create Ticket'-Button.",
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/	

		// ticket_response Command (sends a standard response for applications)
		{
			Name:        "ticket_response",
			Description: "Gibt Standardantwort für Bewerbungen aus",
			Options: []*discordgo.ApplicationCommandOption{
				{Type: discordgo.ApplicationCommandOptionString, Name: "variant", Description: "Antwort-Variante",
				Required: true,
				Choices: []*discordgo.ApplicationCommandOptionChoice{
					{Name: "Pro-Team nicht möglich", Value: "pro_not_eligible"},
					{Name: "Nicht für Pro beworben", Value: "not_applied_pro"},
					},
				},
			},
			DefaultMemberPermissions: nil,
		},

		/*----------------------------------------------------------*/	

		// create_team_area Command (creates a team area with channels and roles)
		{
			Name:        "create_team_area",
			Description: "Erstellt Rolle, Kategorie und Channels für ein Team.",
			Options: []*discordgo.ApplicationCommandOption{
				{Type: discordgo.ApplicationCommandOptionString, Name: "game", Description: "Spiel auswählen", Required: true,
					Choices: []*discordgo.ApplicationCommandOptionChoice{
						{Name: "Rainbow 6", Value: "R6"},
						{Name: "Rocket League", Value: "RL"},
						{Name: "Valorant", Value: "VALO"},
						{Name: "Counter Strike 2", Value: "CS2"},
						{Name: "League of Legends", Value: "LOL"},
						// {Name: "Clash of Clans", Value: "COC"}, Vorläufig deaktiviert
					},
				},
				{Type: discordgo.ApplicationCommandOptionString, Name: "teamname", Description: "Name des Teams", Required: true},
				{Type: discordgo.ApplicationCommandOptionBoolean, Name: "scrim", Description: "Scrim-Channel erstellen?", Required: true},
				{Type: discordgo.ApplicationCommandOptionBoolean, Name: "results", Description: "Results-Channel erstellen?", Required: true},
				{Type: discordgo.ApplicationCommandOptionBoolean, Name: "orga", Description: "Orga-Channel erstellen?", Required: true},
				{Type: discordgo.ApplicationCommandOptionBoolean, Name: "notes", Description: "Notes-Channel erstellen?", Required: true},
			},
			DefaultMemberPermissions: nil,
    	},

		/*----------------------------------------------------------*/	

		// delete_team_area Command (deletes a team area with channels and roles)
		{
			Name:        "delete_team_area",
			Description: "Löscht einen Team-Bereich komplett",
			Options: []*discordgo.ApplicationCommandOption{
				{
				Type:        discordgo.ApplicationCommandOptionString,
				Name:        "category_id",
				Description: "ID der Kategorie des Team-Bereichs",
				Required:    true,
				},
			},
			DefaultMemberPermissions: nil,
		},

		/*----------------------------------------------------------*/

		// music Command (sends a help message for music commands)
		{
			Name:        "music",
			Description: "Musik-Commands Help Liste",
			DefaultMemberPermissions: nil,
		},

		/*----------------------------------------------------------*/

		// cplist Command (sends a list of CPs)
		{
			Name:        "cplist",
			Description: "Sendet eine Liste der CPs",
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/

		{
			Name:        "quiz_role",
			Description: "Hole dir deine Quiz-Rolle",
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/

		{
			Name:        "send_survey",
			Description: "Sende eine Umfrage per DM an alle mit einer Rolle",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionRole,
					Name:        "roleid",
					Description: "Ziel-Rolle",
					Required:    true,
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "surveyid",
					Description: "Interne Umfrage-ID",
					Required:    true,
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "type",
					Description: "Welcher Umfrage-Typ?",
					Required:    true,
					Choices:     surveys.CommandChoices(),
				},
        	},
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/	
	}
	/*==============================================*/
	// END OF COMMAND REGISTRATION
	/*==============================================*/

	guildID := os.Getenv("GUILD_ID")
	for _, cmd := range commands {
		_, err := s.ApplicationCommandCreate(s.State.User.ID, guildID, cmd)
		if err != nil {
			log.Fatalf("Fehler beim Registrieren des Commands '%s': %v", cmd.Name, err)
		}
		log.Printf("Command '%s' registriert.", cmd.Name)
	}
} 

/*--------------------------------------------------------------------------------------------------------------------------*/
