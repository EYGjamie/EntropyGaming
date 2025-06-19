package staffmember

import (
    "database/sql"
    "log"
    "time"
    "os"

    "github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// Updates db entries for staff members, old ones get deleted
func StartRoleUpdater(s *discordgo.Session, db *sql.DB, guildID string) {
    roleMappings := map[string]string{
        "ticket_pro_teams":           os.Getenv("ROLE_TICKET_PROTEAMS"),
        "ticket_bewerbung_staff":     os.Getenv("ROLE_TICKET_STAFFAPPLICATION"),
        "ticket_support_kontakt":     os.Getenv("ROLE_TICKET_SUPPORT_CONTACT"),
        "ticket_sonstiges":           os.Getenv("ROLE_TICKET_SONSTIGE"),
        "ticket_content_creator":     os.Getenv("ROLE_TICKET_CONTENT_CREATOR"),
        "ticket_game_lol":            os.Getenv("ROLE_TICKET_GAME_LOL"),
        "ticket_game_r6":             os.Getenv("ROLE_TICKET_GAME_R6"),
        "ticket_game_cs2":            os.Getenv("ROLE_TICKET_GAME_CS2"),
        "ticket_game_valorant":       os.Getenv("ROLE_TICKET_GAME_VALORANT"),
        "ticket_game_rocket_league":  os.Getenv("ROLE_TICKET_GAME_ROCKETLEAGUE"),
        "ticket_game_sonstige":       os.Getenv("ROLE_TICKET_GAME_SONSTIGE"),
        // "game_splatoon":    os.Getenv("ROLE_TICKET_GAME_SPLATOON"),
    }

    ticker := time.NewTicker(2 * time.Minute)
    go func() {
        for range ticker.C {
            updateStaffMembers(s, db, guildID, roleMappings)
        }
    }()
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// gets all members of a guild (even if member count > 1000)
func getAllGuildMembers(s *discordgo.Session, guildID string) ([]*discordgo.Member, error) {
    var allMembers []*discordgo.Member
    after := ""
    for {
        members, err := s.GuildMembers(guildID, after, 1000)
        if err != nil {
            return nil, err
        }
        if len(members) == 0 {
            break
        }
        allMembers = append(allMembers, members...)
        after = members[len(members)-1].User.ID
        if len(members) < 1000 {
            break
        }
    }
    return allMembers, nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// updateStaffMembers updates database
// 1. User with specific Staff Roles get added to table "entropy_staff_member" if not already present
// 2. Entries in the database that are not present in the guild anymore get removed
// 3. If a user has multiple roles, they will be added to the table multiple times, one for each role
func updateStaffMembers(s *discordgo.Session, db *sql.DB, guildID string, roleMappings map[string]string) {
    for bereich, roleID := range roleMappings {
        members, err := getAllGuildMembers(s, guildID)
        if err != nil {
            log.Printf("Fehler beim Abrufen der Mitglieder: %v", err)
            continue
        }

        currentMembers := make(map[string]bool)
        for _, member := range members {
            if containsRole(member.Roles, roleID) {
                currentMembers[member.User.ID] = true
                addStaffMember(db, bereich, member.User.ID, member.User.Username)
            }
        }

        rows, err := db.Query("SELECT staff_discord_user_id FROM entropy_staff_member WHERE staff_bereich = ?", bereich)
        if err != nil {
            log.Printf("Fehler beim Abrufen der DB-Einträge für %s: %v", bereich, err)
            continue
        }
        defer rows.Close()

        for rows.Next() {
            var userID string
            if err := rows.Scan(&userID); err != nil {
                log.Printf("Fehler beim Scannen der DB-Einträge: %v", err)
                continue
            }
            if !currentMembers[userID] {
                removeStaffMember(db, bereich, userID)
            }
        }
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// check if a role is present in the list of roles of the user
func containsRole(roles []string, roleID string) bool {
    for _, id := range roles {
        if id == roleID {
            return true
        }
    }
    return false
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// adds a staff member to the database if not already present
func addStaffMember(db *sql.DB, bereich, userID, username string) {
    var count int
    row := db.QueryRow("SELECT COUNT(*) FROM entropy_staff_member WHERE staff_bereich = ? AND staff_discord_user_id = ?", bereich, userID)
    if err := row.Scan(&count); err != nil {
        log.Printf("Fehler beim Überprüfen des Eintrags: %v", err)
        return
    }
    if count > 0 {
        return
    }
    _, err := db.Exec("INSERT INTO entropy_staff_member (staff_bereich, staff_discord_user_id, staff_discord_user_name) VALUES (?, ?, ?)", bereich, userID, username)
    if err != nil {
        log.Printf("Fehler beim Einfügen in die Datenbank: %v", err)
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// removes a staff member from the database
func removeStaffMember(db *sql.DB, bereich, userID string) {
    _, err := db.Exec("DELETE FROM entropy_staff_member WHERE staff_bereich = ? AND staff_discord_user_id = ?", bereich, userID)
    if err != nil {
        log.Printf("Fehler beim Entfernen des Eintrags: %v", err)
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/
