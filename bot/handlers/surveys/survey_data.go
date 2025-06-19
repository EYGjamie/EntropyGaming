package surveys

import "github.com/bwmarrin/discordgo"

type SurveyDefinition struct {
    ID       string   // eindeutige ID
    Title    string   // Titel der Umfrage
    Question string   // die eine Frage
    Options  []string // Dropdown-Auswahl
}

var Definitions = map[string]SurveyDefinition{
    // "template": {
    //     ID:       "feedback",
    //     Title:    "Feedback-Umfrage",
    //     Question: "Wie zufrieden bist du mit unserem Service?",
    //     Options:  []string{"1 – sehr unzufrieden", "2 – unzufrieden", "3 – neutral", "4 – zufrieden", "5 – sehr zufrieden"},
    // },
	"test_umfrage": {
	    ID:       "test_umfrage",
	    Title:    "Test-Umfrage",
	    Question: "Funktioniert das?",
	    Options:  []string{"1 – Ja", "2 – Ja", "3 – Ja", "4 – Halts Maul", "5 – Ja"},
	},

    "umfrage_woher_kennt_ihr_uns": {
        ID:       "umfrage_woher_kennt_ihr_uns",
        Title:    "Kurze Umfrage für den Diamond Club: Woher kennt ihr uns?",
        Question: "Wir würden uns freuen, wenn ihr uns kurz mitteilt, woher ihr uns kennt. Das hilft uns, unsere Community besser zu verstehen und zu wachsen. \nWir wissen dass manche die Umfrage schon erhalten haben, jedoch wäre es klasse wenn ihr diese erneut ausfüllen könntet.",
        Options:  []string{"Discord", "Gamertransfer", "Social Media", "Freunde", "Sonstige"},
    },
}

func CommandChoices() []*discordgo.ApplicationCommandOptionChoice {
    out := make([]*discordgo.ApplicationCommandOptionChoice, 0, len(Definitions))
    for _, def := range Definitions {
        out = append(out, &discordgo.ApplicationCommandOptionChoice{
            Name:  def.Title,
            Value: def.ID,
        })
    }
    return out
}
