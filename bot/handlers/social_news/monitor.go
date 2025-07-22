package social_news

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

// MonitorService handles the monitoring of all social platforms
type MonitorService struct {
	db               *sql.DB
	discord          *discordgo.Session
	dbService        *DatabaseService
	notifyService    *NotificationService
	apiClients       map[Platform]APIClient
	cron             *cron.Cron
	config           *Config
	lastContentCheck map[string]time.Time
}

// NewMonitorService creates a new monitor service
func NewMonitorService(db *sql.DB, discord *discordgo.Session, config *Config) *MonitorService {
	dbService := NewDatabaseService(db)
	notifyService := NewNotificationService(discord, dbService)
	
	// Initialize API clients
	apiClients := make(map[Platform]APIClient)
	
	// TODO: Initialize with actual API credentials from environment
	// apiClients[PlatformTwitch] = NewTwitchClient(os.Getenv("TWITCH_CLIENT_ID"), os.Getenv("TWITCH_CLIENT_SECRET"))
	// apiClients[PlatformYouTube] = NewYouTubeClient(os.Getenv("YOUTUBE_API_KEY"))
	// apiClients[PlatformTwitter] = NewTwitterClient(os.Getenv("TWITTER_BEARER_TOKEN"))
	
	location, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		location = time.UTC
	}
	
	return &MonitorService{
		db:               db,
		discord:          discord,
		dbService:        dbService,
		notifyService:    notifyService,
		apiClients:       apiClients,
		cron:             cron.New(cron.WithLocation(location)),
		config:           config,
		lastContentCheck: make(map[string]time.Time),
	}
}

// Start begins the monitoring process
func (ms *MonitorService) Start() error {
	// Initialize database tables
	if err := ms.dbService.InitializeTables(); err != nil {
		return fmt.Errorf("failed to initialize database tables: %w", err)
	}
	
	// Schedule monitoring task
	_, err := ms.cron.AddFunc(ms.config.CronSpec, func() {
		if err := ms.checkAllCreators(); err != nil {
			utils.LogAndNotifyAdmins(ms.discord, "high", "Error", "monitor.go", true, err, "Error during social media monitoring")
		}
	})
	
	if err != nil {
		return fmt.Errorf("failed to schedule monitoring task: %w", err)
	}
	
	ms.cron.Start()
	log.Println("Social News Monitor started successfully")
	return nil
}

// Stop stops the monitoring process
func (ms *MonitorService) Stop() {
	ms.cron.Stop()
}

// checkAllCreators checks all active creators for updates
func (ms *MonitorService) checkAllCreators() error {
	creators, err := ms.dbService.GetCreators(nil, true)
	if err != nil {
		return fmt.Errorf("failed to get creators: %w", err)
	}
	
	for _, creator := range creators {
		if err := ms.checkCreator(creator); err != nil {
			log.Printf("Error checking creator %s (%s): %v", creator.Name, creator.Platform, err)
			continue
		}
	}
	
	return nil
}

// checkCreator checks a specific creator for updates
func (ms *MonitorService) checkCreator(creator *Creator) error {
	apiClient, exists := ms.apiClients[creator.Platform]
	if !exists {
		return fmt.Errorf("no API client available for platform %s", creator.Platform)
	}
	
	// Check for live status
	if err := ms.checkLiveStatus(creator, apiClient); err != nil {
		log.Printf("Error checking live status for %s: %v", creator.Name, err)
	}
	
	// Check for new videos
	if err := ms.checkNewVideos(creator, apiClient); err != nil {
		log.Printf("Error checking videos for %s: %v", creator.Name, err)
	}
	
	// Check for new posts (Twitter/Instagram)
	if creator.Platform == PlatformTwitter || creator.Platform == PlatformInstagram {
		if err := ms.checkNewPosts(creator, apiClient); err != nil {
			log.Printf("Error checking posts for %s: %v", creator.Name, err)
		}
	}
	
	return nil
}

// checkLiveStatus checks if creator is live
func (ms *MonitorService) checkLiveStatus(creator *Creator, apiClient APIClient) error {
	liveContent, err := apiClient.GetLiveStatus(creator.ChannelID)
	if err != nil {
		return err
	}
	
	// Get existing live notifications
	liveNotifications, err := ms.dbService.GetActiveNotifications(NotificationLive)
	if err != nil {
		return err
	}
	
	// Check if creator is currently live
	if liveContent != nil && liveContent.IsLive {
		// Check if we already have a notification for this live stream
		hasNotification := false
		for _, notification := range liveNotifications {
			if notification.CreatorID == creator.ID && notification.ContentID == liveContent.ID {
				hasNotification = true
				break
			}
		}
		
		if !hasNotification {
			// Send live notification
			messageID, err := ms.notifyService.SendLiveNotification(creator, liveContent, ms.config.LiveChannelID)
			if err != nil {
				return err
			}
			
			// Save notification to database
			notification := &Notification{
				CreatorID:        creator.ID,
				Type:             NotificationLive,
				ContentID:        liveContent.ID,
				ContentTitle:     liveContent.Title,
				ContentURL:       liveContent.URL,
				DiscordMessageID: messageID,
				DiscordChannelID: ms.config.LiveChannelID,
				IsActive:         true,
			}
			
			_, err = ms.dbService.CreateNotification(notification)
			if err != nil {
				log.Printf("Failed to save live notification for %s: %v", creator.Name, err)
			}
		}
	} else {
		// Creator is not live, deactivate any active live notifications
		for _, notification := range liveNotifications {
			if notification.CreatorID == creator.ID {
				// Delete Discord message
				ms.discord.ChannelMessageDelete(notification.DiscordChannelID, notification.DiscordMessageID)
				
				// Deactivate notification
				ms.dbService.DeactivateNotification(notification.ID)
			}
		}
	}
	
	return nil
}

// checkNewVideos checks for new video uploads
func (ms *MonitorService) checkNewVideos(creator *Creator, apiClient APIClient) error {
	videos, err := apiClient.GetLatestVideos(creator.ChannelID, 5)
	if err != nil {
		return err
	}
	
	for _, video := range videos {
		// Check if we've already processed this video
		lastCheck, exists := ms.lastContentCheck[fmt.Sprintf("%d_video", creator.ID)]
		if !exists {
			ms.lastContentCheck[fmt.Sprintf("%d_video", creator.ID)] = time.Now().Add(-24 * time.Hour)
			lastCheck = ms.lastContentCheck[fmt.Sprintf("%d_video", creator.ID)]
		}
		
		if video.PublishedAt.After(lastCheck) {
			// Send video notification
			messageID, err := ms.notifyService.SendVideoNotification(creator, video, ms.config.VideoChannelID)
			if err != nil {
				log.Printf("Failed to send video notification for %s: %v", creator.Name, err)
				continue
			}
			
			// Save notification
			notification := &Notification{
				CreatorID:        creator.ID,
				Type:             NotificationVideo,
				ContentID:        video.ID,
				ContentTitle:     video.Title,
				ContentURL:       video.URL,
				DiscordMessageID: messageID,
				DiscordChannelID: ms.config.VideoChannelID,
				IsActive:         true,
			}
			
			_, err = ms.dbService.CreateNotification(notification)
			if err != nil {
				log.Printf("Failed to save video notification for %s: %v", creator.Name, err)
			}
		}
	}
	
	ms.lastContentCheck[fmt.Sprintf("%d_video", creator.ID)] = time.Now()
	return nil
}

// checkNewPosts checks for new social posts
func (ms *MonitorService) checkNewPosts(creator *Creator, apiClient APIClient) error {
	posts, err := apiClient.GetLatestPosts(creator.ChannelID, 5)
	if err != nil {
		return err
	}
	
	for _, post := range posts {
		// Check if we've already processed this post
		lastCheck, exists := ms.lastContentCheck[fmt.Sprintf("%d_post", creator.ID)]
		if !exists {
			ms.lastContentCheck[fmt.Sprintf("%d_post", creator.ID)] = time.Now().Add(-24 * time.Hour)
			lastCheck = ms.lastContentCheck[fmt.Sprintf("%d_post", creator.ID)]
		}
		
		if post.PublishedAt.After(lastCheck) {
			// Send post notification
			messageID, err := ms.notifyService.SendPostNotification(creator, post, ms.config.PostChannelID)
			if err != nil {
				log.Printf("Failed to send post notification for %s: %v", creator.Name, err)
				continue
			}
			
			// Save notification
			notification := &Notification{
				CreatorID:        creator.ID,
				Type:             NotificationPost,
				ContentID:        post.ID,
				ContentTitle:     post.Title,
				ContentURL:       post.URL,
				DiscordMessageID: messageID,
				DiscordChannelID: ms.config.PostChannelID,
				IsActive:         true,
			}
			
			_, err = ms.dbService.CreateNotification(notification)
			if err != nil {
				log.Printf("Failed to save post notification for %s: %v", creator.Name, err)
			}
		}
	}
	
	ms.lastContentCheck[fmt.Sprintf("%d_post", creator.ID)] = time.Now()
	return nil
}