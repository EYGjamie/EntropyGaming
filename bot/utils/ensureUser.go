package utils

import (
    "bot/database"
    "github.com/bwmarrin/discordgo"
    "bot/shared"
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
    member, err := bot.GuildMember(GetIdFromDB(bot, "GUILD_ID"), discordID)
    if err != nil {
        LogAndNotifyAdmins(bot, "low", "Error", "ensureUser.go", false, err, "Fehler beim Abrufen des Guild Members: " + discordID)
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
    hasRoles := CheckUserRoles(bot, member)

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
func CheckUserRoles(bot *discordgo.Session, member *discordgo.Member) shared.UserRoles {
    roles := shared.UserRoles{}
    if member == nil {
        return roles
    }
    // Alle Rollen des Users durchgehen
    for _, roleID := range member.Roles {
        switch roleID {
        case GetIdFromDB(bot, "ROLE_DIAMOND_CLUB"):
            roles.DiamondClub = true
        case GetIdFromDB(bot, "ROLE_DIAMOND_TEAMS"):
            roles.DiamondTeams = true
        case GetIdFromDB(bot, "ROLE_ENTROPY_MEMBER"):
            roles.EntropyMember = true
        case GetIdFromDB(bot, "ROLE_MANAGEMENT"):
            roles.Management = true
        case GetIdFromDB(bot, "ROLE_HEAD_OF_DISCORD"):
            roles.Developer = true
        case GetIdFromDB(bot, "ROLE_HEAD_MANAGEMENT"):
            roles.HeadManagement = true
        case GetIdFromDB(bot, "ROLE_PROJEKTLEITUNG"):
            roles.Projektleitung = true
        }
    }

    return roles
}

func UpdateAllUsers(bot *discordgo.Session, guildID string) error {
    members, err := bot.GuildMembers(guildID, "", 1000)
    if err != nil {
        return err
    }

    for _, member := range members {
        _, err := EnsureUser(bot, guildID)
        if err != nil {
            LogAndNotifyAdmins(bot, "low", "Error", "ensureUser.go", true, err, "Fehler beim Aktualisieren des Benutzers: " + member.User.ID)
        }
    }

    return nil
}