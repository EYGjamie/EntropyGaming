package tickets

import (
	"log"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleTicketView sendet ein Embed mit dem "Create Ticket"-Button
func HandleTicketView(s *discordgo.Session, i *discordgo.InteractionCreate) {
	embed := &discordgo.MessageEmbed{
		Title:       "Ticket-System – Bewerbung & Support",
		Description: "Willkommen beim Ticket-System von **Entropy Gaming**!",
		Color:       0xff0000,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:  "Bewerbung",
				Value: "Möchtest du ein Teil von Entropy Gaming werden? Bewirb dich jetzt und wähle den Bereich aus, für den du dich bewerben möchtest. Teile uns im Ticket einige Infos zu dir mit (Name, Alter, bisherige E-Sports-Erfahrung etc.).",
			},
			{
				Name:  "Support",
				Value: "Hast du ein Problem oder benötigst Unterstützung vom Entropy-Management? Erstelle einfach ein Ticket und wir kümmern uns zeitnah um dein Anliegen!",
			},
		},
		Thumbnail: &discordgo.MessageEmbedThumbnail{
			URL: "https://cdn.discordapp.com/attachments/1070984227576889354/1359266000163311674/entropy_profilbild.png?ex=67f6da9c&is=67f5891c&hm=6ab8e6ab278db6866694d41af2f21e74b36deaaa795a2913aab94a49d5b2bbbb&",
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Entropy Gaming | Ticket System",
		},
	}
	

	// Button erstellen
	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.Button{
					Style:    discordgo.PrimaryButton,
					Label:    "Create Ticket",
					CustomID: "ticket_create_ticket",
				},
			},
		},
	}

	// Embed mit Buttons senden
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds:     []*discordgo.MessageEmbed{embed},
			Components: components,
		},
	})
	if err != nil {
		log.Println("Fehler beim Senden des Ticket Views:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleCreateTicket zeigt das Dropdown-Menü für die Ticket-Bereiche an
func HandleCreateTicket(s *discordgo.Session, i *discordgo.InteractionCreate) {
	options := []discordgo.SelectMenuOption{
		// {Label: "Beitritt Diamond Club", Value: "ticket_diamond_club"},
		{Label: "Bewerbung Community Teams", Value: "ticket_community_teams"},
		{Label: "Bewerbung Management", Value: "ticket_bewerbung_staff"},
		{Label: "Bewerbung Content Creator", Value: "ticket_content_creator"},
		{Label: "Bewerbung Pro Teams", Value: "ticket_pro_teams"},
		{Label: "Support/Kontakt", Value: "ticket_support_kontakt"},
		{Label: "Sonstiges", Value: "ticket_sonstiges"},
	}

	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.SelectMenu{
					CustomID:    "ticket_dropdown",
					Placeholder: "Wähle einen Bereich...",
					Options:     options,
				},
			},
		},
	}

	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content:    "Wähle einen Ticket-Bereich aus:",
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: components,
		},
	})

	if err != nil {
		log.Println("Fehler beim Senden des Dropdown-Menüs:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleTicketDropdown zeigt Modals oder zusätzliche Dropdowns basierend auf der Auswahl
func HandleTicketDropdown(s *discordgo.Session, i *discordgo.InteractionCreate) {
	data := i.MessageComponentData()

	switch data.Values[0] {
	case "ticket_diamond_club":
		HandleTicketModal(s, i, "ticket_diamond_club")
	case "ticket_pro_teams":
		HandleTicketModal(s, i, "ticket_pro_teams")
	case "ticket_community_teams":
		ShowGameDropdown(s, i)
	case "ticket_bewerbung_staff":
		HandleTicketModal(s, i, "ticket_bewerbung_staff")
	case "ticket_content_creator":
		HandleTicketModal(s, i, "ticket_content_creator")
	case "ticket_support_kontakt":
		HandleTicketModal(s, i, "ticket_support_kontakt")
	case "ticket_sonstiges":
		HandleTicketModal(s, i, "ticket_sonstiges")
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleGameDropdown zeigt ein Dropdown-Menü zur Auswahl eines Spiels an
func ShowGameDropdown(s *discordgo.Session, i *discordgo.InteractionCreate) {
	options := []discordgo.SelectMenuOption{
		{Label: "League of Legends", Value: "ticket_game_lol"},
		{Label: "RainbowSix", Value: "ticket_game_r6"},
		{Label: "CS2", Value: "ticket_game_cs2"},
		{Label: "Valorant", Value: "ticket_game_valorant"},
		{Label: "Rocket League", Value: "ticket_game_rocket_league"},
		{Label: "Sonstige", Value: "ticket_game_sonstige"},
		// {Label: "Splatoon", Value: "ticket_game_splatoon"},
	}

	components := []discordgo.MessageComponent{
		discordgo.ActionsRow{
			Components: []discordgo.MessageComponent{
				&discordgo.SelectMenu{
					CustomID:    "ticket_game_dropdown",
					Placeholder: "Wähle ein Spiel...",
					Options:     options,
				},
			},
		},
	}

	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content:    "Wähle das Spiel aus, für das du dich bewerben möchtest:",
			Flags:      discordgo.MessageFlagsEphemeral,
			Components: components,
		},
	})

	if err != nil {
		log.Println("Fehler beim Anzeigen des Game-Dropdowns:", err)
	}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// HandleGameDropdown zeigt Modalsbasierend auf der Auswahl
func HandleGameDropdown(s *discordgo.Session, i *discordgo.InteractionCreate) {
	data := i.MessageComponentData()

	switch data.Values[0] {
	case "ticket_game_lol":
		HandleTicketModal(s, i, "ticket_game_lol")
	case "ticket_game_r6":
		HandleTicketModal(s, i, "ticket_game_r6")
	case "ticket_game_cs2":
		HandleTicketModal(s, i, "ticket_game_cs2")
	case "ticket_game_valorant":
		HandleTicketModal(s, i, "ticket_game_valorant")
	case "ticket_game_rocket_league":
		HandleTicketModal(s, i, "ticket_game_rocket_league")
	case "ticket_game_sonstige":
		HandleTicketModal(s, i, "ticket_game_sonstige")
	// case "game_splatoon":
	// 	HandleTicketModal(s, i, "game_splatoon")
	}
}