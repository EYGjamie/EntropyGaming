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

func RegisterCommands(s *discordgo.Session) {
	adminPerm := int64(discordgo.PermissionAdministrator)
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
			Description: "Sendet eine Liste der Contact Persons",
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/

		// quiz_role Command (sends a button to get the quiz role)
		{
			Name:        "quiz_role",
			Description: "Sendet get Quiz-Rolle Button",
			DefaultMemberPermissions: &adminPerm,
		},

		/*----------------------------------------------------------*/

		// send_survey Command (sends a survey to all members with a specific role)
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

	// Register commands on specific guild
	for _, cmd := range commands {
		_, err := s.ApplicationCommandCreate(s.State.User.ID, os.Getenv("GUILD_ID"), cmd)
		if err != nil {
			log.Fatalf("Fehler beim Registrieren des Commands '%s': %v", cmd.Name, err)
		}
		log.Printf("Command '%s' registriert.", cmd.Name)
	}
} 