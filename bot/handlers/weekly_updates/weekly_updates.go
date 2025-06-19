package weekly_updates

import (
	"database/sql"
	"fmt"

	"github.com/bwmarrin/discordgo"
)

// WeeklyUpdatesManager manages the entire weekly updates system
type WeeklyUpdatesManager struct {
	scheduler *Scheduler
	config    *EnvConfig
}

// NewWeeklyUpdatesManager creates a new manager instance
func NewWeeklyUpdatesManager(db *sql.DB, session *discordgo.Session) (*WeeklyUpdatesManager, error) {
	config, err := LoadEnvConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment config: %w", err)
	}
	
	scheduler := NewScheduler(db, session, config)
	
	return &WeeklyUpdatesManager{
		scheduler: scheduler,
		config:    config,
	}, nil
}

// Start starts the weekly updates system
func (wum *WeeklyUpdatesManager) Start() error {
	return wum.scheduler.Start()
}

// Stop stops the weekly updates system
func (wum *WeeklyUpdatesManager) Stop() {
	wum.scheduler.Stop()
}

// GenerateReportsNow generates and sends reports immediately (useful for testing)
func (wum *WeeklyUpdatesManager) GenerateReportsNow() error {
	return wum.scheduler.GenerateAndSendNow()
}

// GetConfig returns the current configuration
func (wum *WeeklyUpdatesManager) GetConfig() *EnvConfig {
	return wum.config
}

// InitializeWeeklyUpdates is a convenience function to set up the weekly updates system
func InitializeWeeklyUpdates(db *sql.DB, session *discordgo.Session) (*WeeklyUpdatesManager, error) {
	manager, err := NewWeeklyUpdatesManager(db, session)
	if err != nil {
		return nil, fmt.Errorf("failed to create weekly updates manager: %w", err)
	}
	
	if err := manager.Start(); err != nil {
		return nil, fmt.Errorf("failed to start weekly updates: %w", err)
	}
	
	return manager, nil
}