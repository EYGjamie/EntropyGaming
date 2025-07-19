package discord

import (
	"bot/handlers/surveys"
	"bot/utils"
	"log"

	"github.com/bwmarrin/discordgo"
)

func DeleteAllCommands(bot *discordgo.Session) {
	guildID := utils.GetIdFromDB(bot, "GUILD_ID")
	commands, err := bot.ApplicationCommands(bot.State.User.ID, guildID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "info", "Error", "commands.go", true, err, "Fehler beim Abrufen der Commands")
		return
	}
	for _, cmd := range commands {
		err := bot.ApplicationCommandDelete(bot.State.User.ID, guildID, cmd.ID)
		if err != nil {
			utils.LogAndNotifyAdmins(bot, "info", "Error", "commands.go", true, err, "Fehler beim Löschen des Commands: " + cmd.Name)
		} 
	}
}

func RegisterCommands(bot *discordgo.Session) {
	adminPermission := int64(discordgo.PermissionAdministrator)
	commands := []*discordgo.ApplicationCommand{
		/*----------------------------------------------------------*/	

		// ticket_view Command (sends the ticket view with 'Create Ticket' button)
		{
			Name:                     "ticket_view",
			Description:              "Sendet das Ticket-View mit 'Create Ticket'-Button.",
			DefaultMemberPermissions: &adminPermission,
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
			DefaultMemberPermissions: &adminPermission,
		},

		/*----------------------------------------------------------*/

		// quiz_role Command (sends a button to get the quiz role)
		{
			Name:        "quiz_role",
			Description: "Sendet get Quiz-Rolle Button",
			DefaultMemberPermissions: &adminPermission,
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
			DefaultMemberPermissions: &adminPermission,
		},

		/*----------------------------------------------------------*/	

		{
			Name:        "stats",
			Description: "Zeigt Server-Statistiken an",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "from",
					Description: "Start-Datum (YYYY-MM-DD, optional)",
					Required:    false,
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "to", 
					Description: "End-Datum (YYYY-MM-DD, optional)",
					Required:    false,
				},
			},
		},

		/*----------------------------------------------------------*/
	}

	// Register commands on specific guild
	for _, cmd := range commands {
		_, err := bot.ApplicationCommandCreate(bot.State.User.ID, utils.GetIdFromDB(bot, "GUILD_ID"), cmd)
		if err != nil {
			utils.LogAndNotifyAdmins(bot, "warn", "Error", "commands.go", true, err, "Fehler beim Registrieren des Commands: " + cmd.Name)
		}
	}
	log.Printf("Alle Commands erfolgreich registriert.")
} 