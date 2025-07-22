package social_news

import (
	"fmt"
	
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// CommandHandler handles Discord slash commands for social news
type CommandHandler struct {
	dbService *DatabaseService
}

// NewCommandHandler creates a new command handler
func NewCommandHandler(dbService *DatabaseService) *CommandHandler {
	return &CommandHandler{
		dbService: dbService,
	}
}

// RegisterCommands registers the slash commands with Discord
func (ch *CommandHandler) RegisterCommands(session *discordgo.Session, guildID string) error {
	commands := []*discordgo.ApplicationCommand{
		{
			Name:        "social_add_creator",
			Description: "Füge einen neuen Creator hinzu",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "platform",
					Description: "Plattform des Creators",
					Required:    true,
					Choices: []*discordgo.ApplicationCommandOptionChoice{
						{Name: "Twitch", Value: string(PlatformTwitch)},
						{Name: "YouTube", Value: string(PlatformYouTube)},
						{Name: "TikTok", Value: string(PlatformTikTok)},
						{Name: "Instagram", Value: string(PlatformInstagram)},
						{Name: "Twitter/X", Value: string(PlatformTwitter)},
					},
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "username",
					Description: "Username des Creators",
					Required:    true,
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "channel_id",
					Description: "Channel/User ID des Creators",
					Required:    true,
				},
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "display_name",
					Description: "Anzeigename des Creators",
					Required:    false,
				},
			},
		},
		{
			Name:        "social_list_creators",
			Description: "Liste alle Creator auf",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "platform",
					Description: "Filter nach Plattform",
					Required:    false,
					Choices: []*discordgo.ApplicationCommandOptionChoice{
						{Name: "Twitch", Value: string(PlatformTwitch)},
						{Name: "YouTube", Value: string(PlatformYouTube)},
						{Name: "TikTok", Value: string(PlatformTikTok)},
						{Name: "Instagram", Value: string(PlatformInstagram)},
						{Name: "Twitter/X", Value: string(PlatformTwitter)},
					},
				},
			},
		},
		{
			Name:        "social_remove_creator",
			Description: "Entferne einen Creator",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionInteger,
					Name:        "creator_id",
					Description: "ID des Creators",
					Required:    true,
				},
			},
		},
		{
			Name:        "social_toggle_creator",
			Description: "Aktiviere/Deaktiviere einen Creator",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionInteger,
					Name:        "creator_id",
					Description: "ID des Creators",
					Required:    true,
				},
			},
		},
	}
	
	for _, cmd := range commands {
		_, err := session.ApplicationCommandCreate(session.State.User.ID, guildID, cmd)
		if err != nil {
			return fmt.Errorf("failed to create command %s: %w", cmd.Name, err)
		}
	}
	
	return nil
}

// HandleCommand handles incoming slash commands
func (ch *CommandHandler) HandleCommand(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	if interaction.ApplicationCommandData().Name == "social_add_creator" {
		ch.handleAddCreator(session, interaction)
	} else if interaction.ApplicationCommandData().Name == "social_list_creators" {
		ch.handleListCreators(session, interaction)
	} else if interaction.ApplicationCommandData().Name == "social_remove_creator" {
		ch.handleRemoveCreator(session, interaction)
	} else if interaction.ApplicationCommandData().Name == "social_toggle_creator" {
		ch.handleToggleCreator(session, interaction)
	}
}

func (ch *CommandHandler) handleAddCreator(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	// Check permissions
	if !utils.CheckUserPermissions(session, interaction, utils.RequireRoleManagement) {
		return
	}
	
	options := interaction.ApplicationCommandData().Options
	platform := Platform(options[0].StringValue())
	username := options[1].StringValue()
	channelID := options[2].StringValue()
	
	displayName := username
	if len(options) > 3 && options[3].StringValue() != "" {
		displayName = options[3].StringValue()
	}
	
	creator := &Creator{
		Name:        displayName,
		Platform:    platform,
		ChannelID:   channelID,
		Username:    username,
		DisplayName: displayName,
		IsActive:    true,
	}
	
	createdCreator, err := ch.dbService.CreateCreator(creator)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "commands.go", true, err, "Failed to create creator")
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Hinzufügen des Creators.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	embed := &discordgo.MessageEmbed{
		Title: "✅ Creator hinzugefügt",
		Color: 0x00FF00,
		Fields: []*discordgo.MessageEmbedField{
			{Name: "ID", Value: fmt.Sprintf("%d", createdCreator.ID), Inline: true},
			{Name: "Name", Value: createdCreator.DisplayName, Inline: true},
			{Name: "Plattform", Value: string(createdCreator.Platform), Inline: true},
			{Name: "Username", Value: createdCreator.Username, Inline: true},
			{Name: "Channel ID", Value: createdCreator.ChannelID, Inline: true},
			{Name: "Status", Value: "✅ Aktiv", Inline: true},
		},
		Timestamp: createdCreator.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	
	session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:  discordgo.MessageFlagsEphemeral,
		},
	})
}

func (ch *CommandHandler) handleListCreators(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	options := interaction.ApplicationCommandData().Options
	var platform *Platform
	
	if len(options) > 0 && options[0].StringValue() != "" {
		p := Platform(options[0].StringValue())
		platform = &p
	}
	
	creators, err := ch.dbService.GetCreators(platform, false)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "commands.go", true, err, "Failed to get creators")
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Abrufen der Creator-Liste.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	if len(creators) == 0 {
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "📝 Keine Creator gefunden.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	var fields []*discordgo.MessageEmbedField
	for _, creator := range creators {
		status := "✅ Aktiv"
		if !creator.IsActive {
			status = "❌ Inaktiv"
		}
		
		fields = append(fields, &discordgo.MessageEmbedField{
			Name: fmt.Sprintf("#%d - %s", creator.ID, creator.DisplayName),
			Value: fmt.Sprintf("**Plattform:** %s\n**Username:** %s\n**Status:** %s", 
				string(creator.Platform), creator.Username, status),
			Inline: true,
		})
	}
	
	embed := &discordgo.MessageEmbed{
		Title:  "📋 Creator Liste",
		Color:  0x0099FF,
		Fields: fields,
	}
	
	session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
			Flags:  discordgo.MessageFlagsEphemeral,
		},
	})
}

func (ch *CommandHandler) handleRemoveCreator(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	// Check permissions
	if !utils.CheckUserPermissions(session, interaction, utils.RequireRoleManagement) {
		return
	}
	
	creatorID := int(interaction.ApplicationCommandData().Options[0].IntValue())
	
	err := ch.dbService.DeleteCreator(creatorID)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "commands.go", true, err, "Failed to delete creator")
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Entfernen des Creators.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("✅ Creator #%d wurde erfolgreich entfernt.", creatorID),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}

func (ch *CommandHandler) handleToggleCreator(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	// Check permissions
	if !utils.CheckUserPermissions(session, interaction, utils.RequireRoleManagement) {
		return
	}
	
	creatorID := int(interaction.ApplicationCommandData().Options[0].IntValue())
	
	// Get current creator
	creators, err := ch.dbService.GetCreators(nil, false)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "commands.go", true, err, "Failed to get creator")
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Abrufen des Creators.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	var targetCreator *Creator
	for _, creator := range creators {
		if creator.ID == creatorID {
			targetCreator = creator
			break
		}
	}
	
	if targetCreator == nil {
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Creator nicht gefunden.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	// Toggle status
	targetCreator.IsActive = !targetCreator.IsActive
	
	err = ch.dbService.UpdateCreator(targetCreator)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "commands.go", true, err, "Failed to update creator")
		session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "❌ Fehler beim Aktualisieren des Creators.",
				Flags:   discordgo.MessageFlagsEphemeral,
			},
		})
		return
	}
	
	status := "aktiviert"
	if !targetCreator.IsActive {
		status = "deaktiviert"
	}
	
	session.InteractionRespond(interaction.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("✅ Creator #%d (%s) wurde %s.", creatorID, targetCreator.DisplayName, status),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
}