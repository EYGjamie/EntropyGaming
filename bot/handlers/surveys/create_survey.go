package surveys

import (
    "database/sql"
    "fmt"

    "github.com/bwmarrin/discordgo"
    "bot/handlers/tracking"
)

// SendSurvey löst /send_survey aus
func SendSurvey(s *discordgo.Session, i *discordgo.InteractionCreate, db *sql.DB) {
    data := i.ApplicationCommandData()
    roleID := data.Options[0].RoleValue(s, i.GuildID).ID
    surveyID := data.Options[1].StringValue()
    surveyType := data.Options[2].StringValue()

    def, ok := Definitions[surveyType]
    if !ok {
        s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
            Type: discordgo.InteractionResponseChannelMessageWithSource,
            Data: &discordgo.InteractionResponseData{
                Content: "Ungültiger Umfrage-Typ.",
                Flags:   discordgo.MessageFlagsEphemeral,
            },
        })
        return
    }

	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
        Type: discordgo.InteractionResponseChannelMessageWithSource,
        Data: &discordgo.InteractionResponseData{
            Content: fmt.Sprintf("Die Umfrage `%s` (%s) wird an alle Mitglieder mit der Rolle <@&%s> verschickt…", surveyID, def.Title, roleID),
            Flags:   discordgo.MessageFlagsEphemeral,
        },
    })

    // 1) In surveys-Tabelle speichern
    if _, err := db.Exec(
        `INSERT INTO surveys(id, survey_type, role_id) VALUES(?, ?, ?)`,
        surveyID, surveyType, roleID,
    ); err != nil {
        s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
            Type: discordgo.InteractionResponseChannelMessageWithSource,
            Data: &discordgo.InteractionResponseData{
                Content: "Fehler beim Anlegen der Umfrage.",
                Flags:   discordgo.MessageFlagsEphemeral,
            },
        })
        return
    }

    // 2) alle Mitglieder paginieren & filtern
    var after string
    var targets []*discordgo.Member
    for {
        members, err := s.GuildMembers(i.GuildID, after, 1000)
        if err != nil {
            break
        }
        for _, m := range members {
            for _, r := range m.Roles {
                if r == roleID {
                    targets = append(targets, m)
                    break
                }
            }
        }
        if len(members) < 1000 {
            break
        }
        after = members[len(members)-1].User.ID
    }

    // 3) DM an jeden Empfänger mit Dropdown
    for _, m := range targets {
        intUID, err := tracking.EnsureUser(db, m.User.ID, m.User.Username)
        if err != nil {
            continue
        }

        ch, err := s.UserChannelCreate(m.User.ID)
        if err != nil {
            continue
        }

        // Baue Dropdown-Optionen
        opts := make([]discordgo.SelectMenuOption, len(def.Options))
        for i, label := range def.Options {
            opts[i] = discordgo.SelectMenuOption{
                Label:       label,
                Value:       label, // Wert identisch mit Label
                Description: "",
            }
        }

        // Nachricht mit Embed + Component
        msg := &discordgo.MessageSend{
            Embed: &discordgo.MessageEmbed{
                Title:       def.Title,
                Description: def.Question,
				Color:       0xff0000, // Rot
            },
            Components: []discordgo.MessageComponent{
                discordgo.ActionsRow{
                    Components: []discordgo.MessageComponent{
                        discordgo.SelectMenu{
                            CustomID: fmt.Sprintf("survey_%s_%d", surveyID, intUID),
                            Options:  opts,
                            Placeholder: "Wähle eine Antwort…",
                            MaxValues: 1,
                        },
                    },
                },
            },
        }

        s.ChannelMessageSendComplex(ch.ID, msg)
    }

    // Ack an den Command-Invoker
    s.FollowupMessageCreate(i.Interaction, true, &discordgo.WebhookParams{
        Content: fmt.Sprintf("Umfrage `%s` (%s) an %d Personen verschickt.", surveyID, def.Title, len(targets)),
        Flags:   discordgo.MessageFlagsEphemeral,
    })
}
