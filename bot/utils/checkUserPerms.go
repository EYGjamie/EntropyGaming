package utils

import (
	"bot/shared"

	"github.com/bwmarrin/discordgo"
)

// RequiredRole definiert die verschiedenen Berechtigungsebenen
type RequiredRole int

const (
	RequireRoleDiamondClub RequiredRole = iota
	RequireRoleDiamondTeams
	RequireRoleEntropyMember
	RequireRoleManagement
	RequireRoleDeveloper
	RequireRoleHeadManagement
	RequireRoleProjektleitung
)

// CheckUserPermissions überprüft ob ein User die erforderlichen Berechtigungen hat
// und sendet bei fehlenden Berechtigungen automatisch eine Embed-Response
func CheckUserPermissions(bot *discordgo.Session, bot_interaction *discordgo.InteractionCreate, requiredRole RequiredRole) bool {	
	EnsureUser(bot, bot_interaction.Member.User.ID)
	userRoles := CheckUserRoles(bot, bot_interaction.Member)
	// Berechtigungslogik anwenden
	hasPermission := checkPermissionHierarchy(&userRoles, requiredRole)
	if !hasPermission {
		sendPermissionDeniedEmbed(bot, bot_interaction, "Dir fehlen die Berechtigungen um diese Aktion auszuführen.")
		return false
	}

	return true
}

// checkPermissionHierarchy implementiert die Berechtigungshierarchie
func checkPermissionHierarchy(userRoles *shared.UserRoles, requiredRole RequiredRole) bool {
	if userRoles.Developer || userRoles.HeadManagement || userRoles.Projektleitung {
		return true
	}

	// Management hat Berechtigung für diamond_club, diamond_teams, entropy_member
	if userRoles.Management {
		switch requiredRole {
			case RequireRoleDiamondClub, RequireRoleDiamondTeams, RequireRoleEntropyMember, RequireRoleManagement:
				return true
		}
	}

	// Spezifische Rollenprüfung
	switch requiredRole {
		case RequireRoleDiamondClub:
			return userRoles.DiamondClub
		case RequireRoleDiamondTeams:
			return userRoles.DiamondTeams
		case RequireRoleEntropyMember:
			return userRoles.EntropyMember
		}

	return false
}

// sendPermissionDeniedEmbed sendet eine Embed-Response für fehlende Berechtigungen
func sendPermissionDeniedEmbed(bot *discordgo.Session, interaction *discordgo.InteractionCreate, message string) {
	embed := &discordgo.MessageEmbed{
		Title:       "❌ Keine Berechtigung",
		Description: message,
		Color:       0xFF0000, // Rot
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Wende dich an einen Administrator, falls du glaubst, dass dies ein Fehler ist.",
		},
	}

	response := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:  discordgo.MessageFlagsEphemeral, // Nur für den User sichtbar
		},
	}

	err := bot.InteractionRespond(interaction.Interaction, response)
	if err != nil {
		LogAndNotifyAdmins(bot, "info", "Error", "checkUserPerms.go", true, err, "Fehler beim Senden der Berechtigungs-Embed-Response")
	}
}

// Hilfsfunktionen für spezifische Berechtigungsebenen (optional)

// IsAdmin prüft ob ein User Admin-Rechte hat (Developer, Head Management, Projektleitung)
func IsAdmin(bot *discordgo.Session, interaction *discordgo.InteractionCreate) bool {
	return CheckUserPermissions(bot, interaction, RequireRoleDeveloper) ||
		CheckUserPermissions(bot, interaction, RequireRoleHeadManagement) ||
		CheckUserPermissions(bot, interaction, RequireRoleProjektleitung)
}

// IsModerator prüft ob ein User Moderator-Rechte hat (Management oder höher)
func IsModerator(bot *discordgo.Session, interaction *discordgo.InteractionCreate) bool {
	return CheckUserPermissions(bot, interaction, RequireRoleManagement)
}

// IsMember prüft ob ein User mindestens Entropy Member ist
func IsMember(bot *discordgo.Session, interaction *discordgo.InteractionCreate) bool {
	return CheckUserPermissions(bot, interaction, RequireRoleEntropyMember)
}