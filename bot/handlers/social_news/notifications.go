package social_news

import (
	"fmt"
	"time"

	"github.com/bwmarrin/discordgo"
)

// NotificationService handles Discord notifications
type NotificationService struct {
	discord   *discordgo.Session
	dbService *DatabaseService
}

// NewNotificationService creates a new notification service
func NewNotificationService(discord *discordgo.Session, dbService *DatabaseService) *NotificationService {
	return &NotificationService{
		discord:   discord,
		dbService: dbService,
	}
}

// SendLiveNotification sends a live stream notification
func (ns *NotificationService) SendLiveNotification(creator *Creator, content *SocialContent, channelID string) (string, error) {
	embed := &discordgo.MessageEmbed{
		Title:       fmt.Sprintf("🔴 %s ist jetzt LIVE!", creator.DisplayName),
		Description: content.Title,
		URL:         content.URL,
		Color:       0xFF0000, // Red for live
		Thumbnail: &discordgo.MessageEmbedThumbnail{
			URL: creator.AvatarURL,
		},
		Image: &discordgo.MessageEmbedImage{
			URL: content.ThumbnailURL,
		},
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "Plattform",
				Value:  string(creator.Platform),
				Inline: true,
			},
			{
				Name:   "Zuschauer",
				Value:  fmt.Sprintf("%d", content.ViewerCount),
				Inline: true,
			},
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: fmt.Sprintf("Live seit %s", content.PublishedAt.Format("15:04")),
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}
	
	message, err := ns.discord.ChannelMessageSendEmbed(channelID, embed)
	if err != nil {
		return "", err
	}
	
	return message.ID, nil
}

// SendVideoNotification sends a video upload notification
func (ns *NotificationService) SendVideoNotification(creator *Creator, content *SocialContent, channelID string) (string, error) {
	embed := &discordgo.MessageEmbed{
		Title:       fmt.Sprintf("📹 Neues Video von %s", creator.DisplayName),
		Description: content.Title,
		URL:         content.URL,
		Color:       0x00FF00, // Green for video
		Thumbnail: &discordgo.MessageEmbedThumbnail{
			URL: creator.AvatarURL,
		},
		Image: &discordgo.MessageEmbedImage{
			URL: content.ThumbnailURL,
		},
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "Plattform",
				Value:  string(creator.Platform),
				Inline: true,
			},
			{
				Name:   "Veröffentlicht",
				Value:  content.PublishedAt.Format("02.01.2006 15:04"),
				Inline: true,
			},
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Neues Video",
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}
	
	if content.Description != "" {
		embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{
			Name:   "Beschreibung",
			Value:  content.Description,
			Inline: false,
		})
	}
	
	message, err := ns.discord.ChannelMessageSendEmbed(channelID, embed)
	if err != nil {
		return "", err
	}
	
	return message.ID, nil
}

// SendPostNotification sends a social post notification
func (ns *NotificationService) SendPostNotification(creator *Creator, content *SocialContent, channelID string) (string, error) {
	platformEmoji := "📱"
	if creator.Platform == PlatformTwitter {
		platformEmoji = "🐦"
	} else if creator.Platform == PlatformInstagram {
		platformEmoji = "📷"
	}
	
	embed := &discordgo.MessageEmbed{
		Title:       fmt.Sprintf("%s Neuer Post von %s", platformEmoji, creator.DisplayName),
		Description: content.Description,
		URL:         content.URL,
		Color:       0x0099FF, // Blue for posts
		Thumbnail: &discordgo.MessageEmbedThumbnail{
			URL: creator.AvatarURL,
		},
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "Plattform",
				Value:  string(creator.Platform),
				Inline: true,
			},
			{
				Name:   "Veröffentlicht",
				Value:  content.PublishedAt.Format("02.01.2006 15:04"),
				Inline: true,
			},
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Neuer Post",
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}
	
	if content.ThumbnailURL != "" {
		embed.Image = &discordgo.MessageEmbedImage{
			URL: content.ThumbnailURL,
		}
	}
	
	message, err := ns.discord.ChannelMessageSendEmbed(channelID, embed)
	if err != nil {
		return "", err
	}
	
	return message.ID, nil
}