package staff

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
	"bot/handlers/discord_administration"
)

// JobMessage represents the structure of the job advertisement message
type JobMessage struct {
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Jobs        []JobListing `json:"jobs"`
	Footer      string      `json:"footer"`
	Color       int         `json:"color"`
}

// JobListing represents a single job opening
type JobListing struct {
	Position    string `json:"position"`
	Department  string `json:"department"`
	Description string `json:"description"`
	Requirements []string `json:"requirements"`
}

// AdvertisingStaffManager manages the weekly job advertisements
type AdvertisingStaffManager struct {
	session    *discordgo.Session
	cron       *cron.Cron
	channels   []string
	configPath string
}

// NewAdvertisingStaffManager creates a new manager instance
func NewAdvertisingStaffManager(session *discordgo.Session) (*AdvertisingStaffManager, error) {
	// Load channels from environment variable
	channelsEnv := os.Getenv("ADVERTISING_STAFF_CHANNELS")
	if channelsEnv == "" {
		return nil, fmt.Errorf("ADVERTISING_STAFF_CHANNELS environment variable not set")
	}
	
	channels := strings.Split(channelsEnv, ",")
	for i, ch := range channels {
		channels[i] = strings.TrimSpace(ch)
	}

	// Set up cron with timezone
	location, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		log.Printf("Warning: Could not load Berlin timezone, using UTC: %v", err)
		location = time.UTC
	}

	c := cron.New(cron.WithLocation(location))
	
	// Get config path
	configPath := filepath.Join("handlers", "advertising", "staff", "job_message.json")

	return &AdvertisingStaffManager{
		session:    session,
		cron:       c,
		channels:   channels,
		configPath: configPath,
	}, nil
}

// Start begins the weekly job advertisement scheduler
func (asm *AdvertisingStaffManager) Start() error {
	// Schedule for every Sunday at 14:00 (2 PM)
	// Cron format: "0 14 * * 0" (minute hour day month weekday)
	_, err := asm.cron.AddFunc("0 14 * * 0", func() {
		if err := asm.sendWeeklyJobAdvertisement(); err != nil {
			discord_administration.LogAndNotifyAdmins(
				asm.session, 
				"Hoch", 
				"Error", 
				"advertising_staff.go", 
				0, 
				err, 
				"Fehler beim Senden der wöchentlichen Stellenausschreibung",
			)
		}
	})
	
	if err != nil {
		return fmt.Errorf("failed to schedule weekly job advertisement: %w", err)
	}

	asm.cron.Start()
	log.Println("Weekly job advertisement scheduler started (Sundays at 14:00)")
	return nil
}

// Stop stops the scheduler
func (asm *AdvertisingStaffManager) Stop() {
	if asm.cron != nil {
		asm.cron.Stop()
	}
}

// SendNow sends the job advertisement immediately (for testing)
func (asm *AdvertisingStaffManager) SendNow() error {
	return asm.sendWeeklyJobAdvertisement()
}

// sendWeeklyJobAdvertisement loads the job message and sends it to all configured channels
func (asm *AdvertisingStaffManager) sendWeeklyJobAdvertisement() error {
	// Load job message from JSON file
	jobMessage, err := asm.loadJobMessage()
	if err != nil {
		return fmt.Errorf("failed to load job message: %w", err)
	}

	// Create Discord embed
	embed := asm.createJobEmbed(jobMessage)

	// Send to all configured channels
	var sendErrors []string
	for _, channelID := range asm.channels {
		if channelID == "" {
			continue
		}

		_, err := asm.session.ChannelMessageSendEmbed(channelID, embed)
		if err != nil {
			sendErrors = append(sendErrors, fmt.Sprintf("Channel %s: %v", channelID, err))
			discord_administration.LogAndNotifyAdmins(asm.session,"Mittel","Error","advertising_staff.go",0,err,fmt.Sprintf("Fehler beim Senden der Stellenausschreibung an Channel %s", channelID))
		} else {
			log.Printf("Successfully sent job advertisement to channel %s", channelID)
		}
	}

	if len(sendErrors) > 0 {
		return fmt.Errorf("failed to send to some channels: %s", strings.Join(sendErrors, "; "))
	}

	log.Printf("Weekly job advertisement sent successfully to %d channels", len(asm.channels))
	return nil
}

// loadJobMessage loads the job message from the JSON configuration file
func (asm *AdvertisingStaffManager) loadJobMessage() (*JobMessage, error) {
	data, err := ioutil.ReadFile(asm.configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read job message file %s: %w", asm.configPath, err)
	}

	var jobMessage JobMessage
	if err := json.Unmarshal(data, &jobMessage); err != nil {
		return nil, fmt.Errorf("failed to parse job message JSON: %w", err)
	}

	return &jobMessage, nil
}

// createJobEmbed creates a Discord embed from the job message
func (asm *AdvertisingStaffManager) createJobEmbed(jobMessage *JobMessage) *discordgo.MessageEmbed {
	embed := &discordgo.MessageEmbed{
		Title:       jobMessage.Title,
		Description: jobMessage.Description,
		Color:       jobMessage.Color,
		Timestamp:   time.Now().Format(time.RFC3339),
	}

	// Add job listings as fields
	for _, job := range jobMessage.Jobs {
		fieldValue := fmt.Sprintf("**Bereich:** %s\n\n%s", job.Department, job.Description)
		
		if len(job.Requirements) > 0 {
			fieldValue += "\n\n**Aufgaben:**"
			for _, req := range job.Requirements {
				fieldValue += fmt.Sprintf("\n• %s", req)
			}
		}

		embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{
			Name:   "# "+job.Position,
			Value:  fieldValue,
			Inline: false,
		})
	}

	// Add footer
	if jobMessage.Footer != "" {
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: jobMessage.Footer,
		}
	}

	return embed
}

// InitializeAdvertisingStaff is a convenience function to set up the advertising staff system
func InitializeAdvertisingStaff(session *discordgo.Session) (*AdvertisingStaffManager, error) {
	manager, err := NewAdvertisingStaffManager(session)
	if err != nil {
		return nil, fmt.Errorf("failed to create advertising staff manager: %w", err)
	}

	if err := manager.Start(); err != nil {
		return nil, fmt.Errorf("failed to start advertising staff scheduler: %w", err)
	}

	return manager, nil
}