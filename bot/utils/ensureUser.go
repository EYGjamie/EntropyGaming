package utils

import (
    "bot/database"
    "github.com/bwmarrin/discordgo"
    "log"
    "bot/shared"
)

// Rollen-IDs (diese musst du mit deinen tatsächlichen Rollen-IDs ersetzen)
const ( // DBMIGRATION
    guildID = ""
    RoleDiamondClub     = "1234567890123456789"
    RoleDiamondTeams    = "1234567890123456790"
    RoleEntropyMember   = "1234567890123456791"
    RoleManagement      = "1234567890123456792"
    RoleDeveloper       = "1234567890123456795"
    RoleHeadManagement  = "1234567890123456793"
    RoleProjektleitung  = "1234567890123456794"
)

// EnsureUser prüft, ob ein Benutzer mit der gegebenen Discord-ID existiert.
// Falls nicht, wird ein neuer Datensatz mit allen verfügbaren Discord-Informationen angelegt.
// Bei Konflikt werden alle Felder aktualisiert.
// Die interne user.id wird zurückgegeben.
func EnsureUser(bot *discordgo.Session, discordID string) (int, error) {
    // Discord User-Informationen abrufen
    user, err := bot.User(discordID)
    if err != nil {
        return 0, err
    }

    // Guild Member-Informationen abrufen (für Rollen und Server-spezifische Daten)
    member, err := bot.GuildMember(guildID, discordID)
    if err != nil {
        log.Printf("Konnte Guild Member nicht abrufen für User %s: %v", discordID, err)
        // Fortsetzung auch ohne Member-Daten möglich
    }

    // User-Daten extrahieren
    username := user.Username
    displayName := user.GlobalName
    if displayName == "" {
        displayName = username
    }
    avatarURL := user.AvatarURL("256")
    isBot := user.Bot

    // Nickname aus Guild Member
    nickname := ""
    var joinedAt *string
    if member != nil {
        if member.Nick != "" {
            nickname = member.Nick
        }
        if !member.JoinedAt.IsZero() {
            joinTime := member.JoinedAt.Format("2006-01-02 15:04:05")
            joinedAt = &joinTime
        }
    }

    // Rollen überprüfen
    hasRoles := CheckUserRoles(member)

    // Datenbankupdate
    var id int
    query := `
        INSERT INTO users (
            discord_id, username, display_name, nickname, avatar_url, 
            is_bot, joined_server_at,
            role_diamond_club, role_diamond_teams, role_entropy_member,
            role_management, role_head_management, role_projektleitung
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(discord_id) DO UPDATE
        SET 
            username = excluded.username,
            display_name = excluded.display_name,
            nickname = excluded.nickname,
            avatar_url = excluded.avatar_url,
            is_bot = excluded.is_bot,
            joined_server_at = excluded.joined_server_at,
            role_diamond_club = excluded.role_diamond_club,
            role_diamond_teams = excluded.role_diamond_teams,
            role_entropy_member = excluded.role_entropy_member,
            role_management = excluded.role_management,
            role_head_management = excluded.role_head_management,
            role_projektleitung = excluded.role_projektleitung,
            last_seen = CURRENT_TIMESTAMP
        RETURNING id;`

    err = database.DB.QueryRow(
        query,
        discordID, username, displayName, nickname, avatarURL,
        isBot, joinedAt,
        hasRoles.DiamondClub, hasRoles.DiamondTeams, hasRoles.EntropyMember,
        hasRoles.Management, hasRoles.HeadManagement, hasRoles.Projektleitung,
    ).Scan(&id)

    if err != nil {
        return 0, err
    }

    return id, nil
}

// checkUserRoles überprüft, welche der 7 definierten Rollen der User hat
func CheckUserRoles(member *discordgo.Member) shared.UserRoles {
    roles := shared.UserRoles{}
    
    if member == nil {
        return roles
    }

    // Alle Rollen des Users durchgehen
    for _, roleID := range member.Roles {
        switch roleID {
        case RoleDiamondClub:
            roles.DiamondClub = true
        case RoleDiamondTeams:
            roles.DiamondTeams = true
        case RoleEntropyMember:
            roles.EntropyMember = true
        case RoleManagement:
            roles.Management = true
        case RoleDeveloper:
            roles.Developer = true
        case RoleHeadManagement:
            roles.HeadManagement = true
        case RoleProjektleitung:
            roles.Projektleitung = true
        }
    }

    return roles
}

// Beispiel für eine Hilfsfunktion zur Batch-Aktualisierung aller Server-Mitglieder
func UpdateAllUsers(bot *discordgo.Session, guildID string) error {
    members, err := bot.GuildMembers(guildID, "", 1000)
    if err != nil {
        return err
    }

    for _, member := range members {
        _, err := EnsureUser(bot, guildID)
        if err != nil {
            log.Printf("Fehler beim Aktualisieren von User %s: %v", member.User.ID, err)
        }
    }

    return nil
}