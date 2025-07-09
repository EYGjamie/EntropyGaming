// TODO - Funktionalität: Werbung an alle User senden, die eine bestimmte Liste an Rollen nicht haben. Rollen sind eine Liste von IDs.


package advertising_club

import (
	"fmt"
	"log"

	"github.com/bwmarrin/discordgo"
	"slices"
)

const ExcludeRoleID = "ID_USER_DIE_WERBUNG_ERHALTEN"

const AllowedRoleID = "ID_DER_ERLAUBTEN_ROLLE"

// Fester Embed-Text für die Werbung
const WerbeEmbedTitel = "Werde Teil unseres Clubs!"
const WerbeEmbedBeschreibung = "Du bist herzlich eingeladen, unserem Club beizutreten! Profitiere von exklusiven Vorteilen und einer tollen Community. Melde dich bei uns für mehr Infos!"

func RegisterAdvertiseCommand(s *discordgo.Session, guildID string) error {
	cmd := &discordgo.ApplicationCommand{
		Name:        "advertise_club",
		Description: "Sende ein Werbe-Embed an alle User, die eine bestimmte Rolle nicht haben.",
	}
	_, err := s.ApplicationCommandCreate(s.State.User.ID, guildID, cmd)
	return err
}

// HandleAdvertiseCommand verarbeitet den Slash Command
func HandleAdvertiseCommand(s *discordgo.Session, i *discordgo.InteractionCreate) {
	member := i.Member
	hasAllowedRole := false
	for _, roleID := range member.Roles {
		if roleID == AllowedRoleID {
			hasAllowedRole = true
			break
		}
	}
	if !hasAllowedRole {
		s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "Du hast keine Berechtigung, diesen Command zu verwenden.",
				Flags:   1 << 6, // Ephemeral
			},
		})
		return
	}

	// Alle Mitglieder des Servers holen
	guildID := i.GuildID
	members := []*discordgo.Member{}
	after := ""
	for {
		ms, err := s.GuildMembers(guildID, after, 1000)
		if err != nil {
			log.Printf("Fehler beim Laden der Mitglieder: %v", err)
			break
		}
		if len(ms) == 0 {
			break
		}
		members = append(members, ms...)
		after = ms[len(ms)-1].User.ID
		if len(ms) < 1000 {
			break
		}
	}

	// Embed vorbereiten
	embed := &discordgo.MessageEmbed{
		Title:       WerbeEmbedTitel,
		Description: WerbeEmbedBeschreibung,
		Color:       0x00bfff,
	}

	// Nachricht an User ohne die festgelegte Rolle senden
	count := 0
	for _, m := range members {
		hasExcludedRole := slices.Contains(m.Roles, ExcludeRoleID)
		if !hasExcludedRole {
			dm, err := s.UserChannelCreate(m.User.ID)
			if err != nil {
				log.Printf("Fehler beim Erstellen des DM-Kanals für %s: %v", m.User.Username, err)
				continue
			}
			_, err = s.ChannelMessageSendEmbed(dm.ID, embed)
			if err != nil {
				log.Printf("Fehler beim Senden der DM an %s: %v", m.User.Username, err)
				continue
			}
			count++
		}
	}

	// Antwort an den Command-User
	resp := fmt.Sprintf("Werbe-Embed wurde an %d Nutzer ohne die Rolle %s gesendet.", count, ExcludeRoleID)
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: resp,
			Flags:   1 << 6, // Ephemeral
		},
	})
}