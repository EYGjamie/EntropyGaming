package social_news

import (
	"time"
)

// Platform enum
type Platform string

const (
	PlatformTwitch    Platform = "twitch"
	PlatformYouTube   Platform = "youtube"
	PlatformTikTok    Platform = "tiktok"
	PlatformInstagram Platform = "instagram"
	PlatformTwitter   Platform = "twitter"
)

// NotificationType enum
type NotificationType string

const (
	NotificationLive   NotificationType = "live"
	NotificationVideo  NotificationType = "video"
	NotificationPost   NotificationType = "post"
)

// Creator represents a social media creator
type Creator struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Platform    Platform  `json:"platform"`
	ChannelID   string    `json:"channel_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   string    `json:"avatar_url"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Notification represents a sent notification
type Notification struct {
	ID               int              `json:"id"`
	CreatorID        int              `json:"creator_id"`
	Type             NotificationType `json:"type"`
	ContentID        string           `json:"content_id"`
	ContentTitle     string           `json:"content_title"`
	ContentURL       string           `json:"content_url"`
	DiscordMessageID string           `json:"discord_message_id"`
	DiscordChannelID string           `json:"discord_channel_id"`
	IsActive         bool             `json:"is_active"`
	CreatedAt        time.Time        `json:"created_at"`
}

// SocialContent represents content from social platforms
type SocialContent struct {
	ID          string    `json:"id"`
	CreatorID   int       `json:"creator_id"`
	Platform    Platform  `json:"platform"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	ThumbnailURL string   `json:"thumbnail_url"`
	IsLive      bool      `json:"is_live"`
	ViewerCount int       `json:"viewer_count"`
	PublishedAt time.Time `json:"published_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// Config holds Discord channel configurations
type Config struct {
	LiveChannelID  string `json:"live_channel_id"`
	VideoChannelID string `json:"video_channel_id"`
	PostChannelID  string `json:"post_channel_id"`
	CronSpec       string `json:"cron_spec"`
}