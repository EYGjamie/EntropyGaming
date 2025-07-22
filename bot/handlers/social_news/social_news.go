package social_news

import (
	"database/sql"
	"fmt"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

// SocialNewsManager manages the entire social news system
type SocialNewsManager struct {
	monitorService *MonitorService
	commandHandler *CommandHandler
	config         *Config
}

// InitializeSocialNews initializes the social news system
func InitializeSocialNews(db *sql.DB, discord *discordgo.Session) (*SocialNewsManager, error) {
	// Load configuration from database
	config := &Config{
		LiveChannelID:  utils.GetIdFromDB(discord, "SOCIAL_NEWS_LIVE_CHANNEL_ID"),
		VideoChannelID: utils.GetIdFromDB(discord, "SOCIAL_NEWS_VIDEO_CHANNEL_ID"),
		PostChannelID:  utils.GetIdFromDB(discord, "SOCIAL_NEWS_POST_CHANNEL_ID"),
		CronSpec:       utils.GetIdFromDB(discord, "SOCIAL_NEWS_CRON_SPEC"),
	}
	
	// Set default cron spec if not configured
	if config.CronSpec == "" {
		config.CronSpec = "*/5 * * * *" // Every 5 minutes
	}
	
	// Initialize services
	dbService := NewDatabaseService(db)
	monitorService := NewMonitorService(db, discord, config)
	commandHandler := NewCommandHandler(dbService)
	
	manager := &SocialNewsManager{
		monitorService: monitorService,
		commandHandler: commandHandler,
		config:         config,
	}
	
	// Register slash commands
	guildID := utils.GetIdFromDB(discord, "GUILD_ID")
	if err := commandHandler.RegisterCommands(discord, guildID); err != nil {
		return nil, fmt.Errorf("failed to register commands: %w", err)
	}
	
	// Start monitoring
	if err := monitorService.Start(); err != nil {
		return nil, fmt.Errorf("failed to start monitoring: %w", err)
	}
	
	utils.LogAndNotifyAdmins(discord, "info", "Info", "social_news.go", true, nil, "Social News System initialized successfully")
	
	return manager, nil
}

// HandleCommand handles slash commands
func (snm *SocialNewsManager) HandleCommand(session *discordgo.Session, interaction *discordgo.InteractionCreate) {
	commandName := interaction.ApplicationCommandData().Name
	if commandName == "social_add_creator" || 
	   commandName == "social_list_creators" || 
	   commandName == "social_remove_creator" || 
	   commandName == "social_toggle_creator" {
		snm.commandHandler.HandleCommand(session, interaction)
	}
}

// Stop stops all services
func (snm *SocialNewsManager) Stop() {
	snm.monitorService.Stop()
}