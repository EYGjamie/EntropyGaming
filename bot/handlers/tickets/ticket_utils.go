package tickets

import (
	"log"
	"strconv"
	"strings"
	"fmt"
    "bot/database"
    "bot/utils"

	"github.com/bwmarrin/discordgo"
)


/*--------------------------------------------------------------------------------------------------------------------------*/

// Helper function to get the Role ID for a ticket based on its custom ID as the const_key in DB isnt matching the custom ID
func getRoleIDForTicket(bot *discordgo.Session, bereich string) string {
    roles := map[string]string{
        "ticket_diamond_club":        utils.GetIdFromDB(bot, "ROLE_TICKET_DIAMOND_CLUB"),
        "ticket_pro_teams":           utils.GetIdFromDB(bot, "ROLE_TICKET_PROTEAMS"),
        "ticket_bewerbung_staff":     utils.GetIdFromDB(bot, "ROLE_TICKET_STAFFAPPLICATION"),
        "ticket_support_kontakt":     utils.GetIdFromDB(bot, "ROLE_TICKET_SUPPORT_CONTACT"),
        "ticket_sonstiges":           utils.GetIdFromDB(bot, "ROLE_TICKET_SONSTIGE"),
        "ticket_content_creator":     utils.GetIdFromDB(bot, "ROLE_TICKET_CONTENT_CREATOR"),
        "ticket_game_lol":            utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_LOL"),
        "ticket_game_r6":             utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_R6"),
        "ticket_game_cs2":            utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_CS2"),
        "ticket_game_valorant":       utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_VALORANT"),
        "ticket_game_rocket_league":  utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_ROCKETLEAGUE"),
        "ticket_game_sonstige":       utils.GetIdFromDB(bot, "ROLE_TICKET_GAME_SONSTIGE"),
        // "game_splatoon":    os.Getenv("ROLE_TICKET_GAME_SPLATOON"),
    }
    if roleID, ok := roles[bereich]; ok {
        return roleID
    }
    return utils.GetIdFromDB(bot, "ROLE_TICKET_STANDARD")
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func getTicketAreaForTicket(area string) string {
    areas := map[string]string{
        "ticket_diamond_club":         "Diamond Club Bewerbung",
        "ticket_pro_teams":            "Pro Team Bewerbung",
        "ticket_bewerbung_staff":      "Bewerbung Staff",
        "ticket_support_kontakt":      "Kontakt/Support",
        "ticket_sonstiges":            "Sonstiges",
        "ticket_content_creator":      "Content Creator",
		"ticket_game_lol":             "League of Legends",
		"ticket_game_r6":              "Rainbow Six",
		"ticket_game_cs2":             "Counter Strike 2",
		"ticket_game_valorant":        "Valorant",
		"ticket_game_rocket_league":   "Rocket League",
        "ticket_game_sonstige":        "Spiel Sonstige",
        //"game_splatoon":      "Splatoon",
    }
    if areaName, ok := areas[area]; ok {
        return areaName
    }
    return "Standardbereich"
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func getLabelsForTicket(bereich string) []string {
    labels := map[string][]string{
        "ticket_diamond_club":          {"Vorname", "Alter", "Dein Main Game", "Gib uns kurz an wann du Zeit hast"},
        "ticket_pro_teams":             {"Vorname", "Alter", "Welches Spiel?", "Erfahrungen im Team?", "Tracker & Social Media",},
        "ticket_bewerbung_staff":       {"Vorname", "Alter", "Für was bewirbst du dich?", "Erfahrungen in dem Bereich?", "Stelle dich kurz vor"},
        "ticket_support_kontakt":       {"Vorname", "Was ist dein Anliegen?"},
        "ticket_sonstiges":             {"Vorname", "Was ist dein Anliegen?"},
        "ticket_content_creator":       {"Vorname", "Alter", "Social Links", "Weiteres"},
        "ticket_game_lol":              {"Vorname", "Alter", "Main Rolle", "Rang", "op.gg Link"},
        "ticket_game_r6":               {"Vorname", "Alter", "R6 Tracker Link", "Plattform", "Infos über DICH!"},
        "ticket_game_cs2":              {"Vorname", "Alter", "Steam Tracker Link", "Rang"},
        "ticket_game_valorant":         {"Vorname", "Alter", "InGame Name", "Tracker Link"},
        "ticket_game_rocket_league":    {"Vorname", "Alter", "InGame Name", "RL Tracker Network Link", "Wunsch Elo"},
        "ticket_game_sonstige":         {"Vorname", "Alter", "Bitte erkläre kurz für was du dich bewirbst"},
        // "game_splatoon":         {"Vorname", "Alter", "InGame Name", "Rang"},
    }
    if labelList, ok := labels[bereich]; ok {
        return labelList
    }
    return []string{}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// gets TicketID from channelName
func ExtractTicketIDFromChannel(channelName string) (int, error) {
	// Channel-Name should have structure like "ticketID-status-creator"
	parts := strings.Split(channelName, "-")
	if len(parts) < 1 {
		return 0, nil
	}

	// konvert the first part to an integer (ticketID)
	ticketID, err := strconv.Atoi(parts[0])
	if err != nil {
		log.Println("Fehler beim Konvertieren der Ticket-ID:", err)
		return 0, err
	}

	return ticketID, nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// gets TicketID from interaction
func GetTicketIDFromInteraction(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate) (int, error) {
	channel, err := bot.Channel(bot_interaction.ChannelID)
	if err != nil {
		log.Println("Fehler beim Abrufen des Kanals:", err)
		return 0, err
	}

	return ExtractTicketIDFromChannel(channel.Name)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// gets username by its discord ID
func GetUsernameByID(bot *discordgo.Session, userID string) string {
	user, err := bot.User(userID)
	if err != nil {
		log.Println("Fehler beim Abrufen des Benutzernamens:", err)
		return "Unbekannt"
	}
	return user.Username
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func getTicketDbInfo(ticket_id int) []string {
    // SQL query to fetch ticket information
    query := `SELECT * FROM tickets WHERE ticket_id = ?`
    row := database.DB.QueryRow(query, ticket_id)

    // Retrieve column names in order to know the number of columns
    cols, err := database.DB.Query(`PRAGMA table_info(tickets)`)
    if err != nil {
        log.Println("Fehler beim Abrufen der Spalteninformationen:", err)
        return []string{}
    }
    defer cols.Close()

    columnCount := 0
    for cols.Next() {
        columnCount++
    }

    // create Slice to hold the values
    values := make([]interface{}, columnCount)
    valuePtrs := make([]interface{}, columnCount)
    for i := range values {
        valuePtrs[i] = &values[i]
    }

    // rows scan into the values slice
    err = row.Scan(valuePtrs...)
    if err != nil {
        log.Println("Fehler beim Scannen der Zeile:", err)
        return []string{}
    }

    // result slice to hold the ticket information
    var ticketInfo []string
    for _, value := range values {
        if value != nil {
            ticketInfo = append(ticketInfo, fmt.Sprintf("%v", value))
        } else {
            ticketInfo = append(ticketInfo, "NULL")
        }
    }

    return ticketInfo
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func addUserChannelPermission(s *discordgo.Session, channelID string, userID string) error {
	// Berechtigungen setzen: Lese- und Schreibrechte erlauben
	permissions := &discordgo.PermissionOverwrite{
		ID:   userID,
		Type: discordgo.PermissionOverwriteTypeMember,
		Allow: discordgo.PermissionAllText,
	}

	// Berechtigung im Channel aktualisieren
	err := s.ChannelPermissionSet(channelID, permissions.ID, permissions.Type, permissions.Allow, 0)
	if err != nil {
		log.Println("Fehler beim Hinzufügen der Berechtigung:", err)
		return err
	}
	return nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func removeUserChannelPermission(s *discordgo.Session, channelID string, userID string) error {
	// Berechtigungen setzen: Keine Lese- oder Schreibrechte
	permissions := &discordgo.PermissionOverwrite{
		ID:   userID,
		Type: discordgo.PermissionOverwriteTypeMember,
		Deny: discordgo.PermissionAllText,
	}

	// Berechtigung im Channel aktualisieren
	err := s.ChannelPermissionSet(channelID, permissions.ID, permissions.Type, 0, permissions.Deny)
	if err != nil {
		log.Println("Fehler beim Entfernen der Berechtigung:", err)
		return err
	}
	return nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/