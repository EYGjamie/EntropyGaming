package discord_administration_utils

import (
    "encoding/json"
    "strings"
    "os"

    "github.com/bwmarrin/discordgo"
)

// Datenstrukturen spiegeln die JSON-Datei wider
type ContactFile struct {
    Title    string    `json:"title"`
    Sections []Section `json:"sections"`
}

type Section struct {
    Title string    `json:"title"`
    Items []Contact `json:"items"`
}

type Contact struct {
    ID string `json:"mention"`
    Name    string `json:"name"`
}

// HandleCPList lädt contacts.json, baut die Beschreibung zusammen und sendet das Embed
func HandleCPList(s *discordgo.Session, i *discordgo.InteractionCreate) {
    // JSON-Datei einlesen
    data, err := os.ReadFile("handlers/discord_administration/utils/data/contacts.json")
    if err != nil {
        // Fehlerbehandlung: sende eine Fehlermeldung
        s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
            Type: discordgo.InteractionResponseChannelMessageWithSource,
            Data: &discordgo.InteractionResponseData{
                Content: "Fehler beim Laden der Kontaktliste.",
                Flags:   discordgo.MessageFlagsEphemeral,
            },
        })
        return
    }

    // In Go-Struct unmarshallen
    var cf ContactFile
    if err := json.Unmarshal(data, &cf); err != nil {
        s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
            Type: discordgo.InteractionResponseChannelMessageWithSource,
            Data: &discordgo.InteractionResponseData{
                Content: "Fehler beim Parsen der Kontaktliste.",
                Flags:   discordgo.MessageFlagsEphemeral,
            },
        })
        return
    }

    // Beschreibung mit Markdown aufbauen
    var sb strings.Builder
    sb.WriteString("## Eure Ansprechpartner:\n")
    for _, sec := range cf.Sections {
    sb.WriteString("### " + sec.Title + "\n")
    for _, c := range sec.Items {
        mention := "<@" + c.ID + ">"
        sb.WriteString(mention + " | " + c.Name + "\n")
		}
		sb.WriteString("\n")
	}
    description := sb.String()

    // Embed erzeugen
    embed := &discordgo.MessageEmbed{
        Title:       cf.Title,
        Description: description,
		Thumbnail: &discordgo.MessageEmbedThumbnail{URL: "https://cdn.discordapp.com/attachments/1070984227576889354/1359266000163311674/entropy_profilbild.png?ex=67f6da9c&is=67f5891c&hm=6ab8e6ab278db6866694d41af2f21e74b36deaaa795a2913aab94a49d5b2bbbb&",},
		Footer: &discordgo.MessageEmbedFooter{Text: "Entropy Gaming | Management",},
        Color:       0xff0000, // EYG Red
    }

    // Antwort senden
    s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
        Type: discordgo.InteractionResponseChannelMessageWithSource,
        Data: &discordgo.InteractionResponseData{
            Embeds: []*discordgo.MessageEmbed{embed},
        },
    })
}
