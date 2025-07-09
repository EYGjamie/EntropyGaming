package staff

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"bot/utils"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

type JobMessage struct {
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Jobs        []JobListing `json:"jobs"`
	Footer      string      `json:"footer"`
	Color       int         `json:"color"`
}

type JobListing struct {
	Position    string `json:"position"`
	Department  string `json:"department"`
	Description string `json:"description"`
	Requirements []string `json:"requirements"`
}

type AdvertisingStaffManager struct {
	session    *discordgo.Session
	cron       *cron.Cron
	channels   []string
	configPath string
}

func NewAdvertisingStaffManager(session *discordgo.Session) (*AdvertisingStaffManager, error) {
	channelsEnv := os.Getenv("ADVERTISING_STAFF_CHANNELS") // => DBMIGRATION
	if channelsEnv == "" {
		utils.LogAndNotifyAdmins(session, "high", "Error", "advertising_staff.go", true, nil, "ADVERTISING_STAFF_CHANNELS environment variable not set")
		return nil, nil
	}
	
	channels := strings.Split(channelsEnv, ",")
	for i, ch := range channels {
		channels[i] = strings.TrimSpace(ch)
	}

	location, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		location = time.UTC
	}

	c := cron.New(cron.WithLocation(location))
	configPath := filepath.Join("handlers", "advertising", "staff", "job_message.json")
	return &AdvertisingStaffManager{session:session, cron:c, channels: channels, configPath: configPath}, nil
}

func (asm *AdvertisingStaffManager) Start() error {
	_, err := asm.cron.AddFunc("0 14 * * 0", func() { // Cron format: (minute hour day month weekday)
		if err := asm.sendWeeklyJobAdvertisement(); err != nil {
			utils.LogAndNotifyAdmins(asm.session, "medium", "Error", "advertising_staff.go", true, err, "Error sending weekly job advertisement")
		}
	})
	
	if err != nil {
		utils.LogAndNotifyAdmins(asm.session, "high", "Error", "advertising_staff.go", true, err, "Error scheduling weekly job advertisement")
		return nil
	}

	asm.cron.Start()
	return nil
}

func (asm *AdvertisingStaffManager) Stop() {
	if asm.cron != nil {
		asm.cron.Stop()
	}
}

func (asm *AdvertisingStaffManager) SendNow() error {
	return asm.sendWeeklyJobAdvertisement()
}

func (asm *AdvertisingStaffManager) sendWeeklyJobAdvertisement() error {
	jobMessage, err := asm.loadJobMessage()
	if err != nil {
		utils.LogAndNotifyAdmins(asm.session, "high", "Error", "advertising_staff.go", true, err, "Error loading job message")
		return nil
	}

	embed := asm.createJobEmbed(jobMessage)

	var sendErrors []string
	for _, channelID := range asm.channels {
		if channelID == "" {
			continue
		}

		_, err := asm.session.ChannelMessageSendEmbed(channelID, embed)
		if err != nil {
			sendErrors = append(sendErrors, fmt.Sprintf("Channel %s: %v", channelID, err))
			utils.LogAndNotifyAdmins(asm.session, "medium" , "Error", "advertising_staff.go", true, err , "Error sending staff ads in Channel" + channelID)
		}
	}

	if len(sendErrors) > 0 {
		utils.LogAndNotifyAdmins(asm.session, "medium", "Error", "advertising_staff.go", true, fmt.Errorf("failed to send to some channels: %s", strings.Join(sendErrors, "; ")), "Failed to send staff ads in some channels")
		return nil
	}
	return nil
}

func (asm *AdvertisingStaffManager) loadJobMessage() (*JobMessage, error) {
	data, err := os.ReadFile(asm.configPath)
	if err != nil {
		utils.LogAndNotifyAdmins(asm.session, "high", "Error", "advertising_staff.go", true, err, "Failed to read job message file: " + asm.configPath)
		return nil, nil
	}
	var jobMessage JobMessage
	if err := json.Unmarshal(data, &jobMessage); err != nil {
		utils.LogAndNotifyAdmins(asm.session, "high", "Error", "advertising_staff.go", true, err, "Failed to parse job message JSON: "+asm.configPath)
		return nil, nil
	}
	return &jobMessage, nil
}

func (asm *AdvertisingStaffManager) createJobEmbed(jobMessage *JobMessage) *discordgo.MessageEmbed {
	embed := &discordgo.MessageEmbed{
		Title:       jobMessage.Title,
		Description: jobMessage.Description,
		Color:       jobMessage.Color,
		Timestamp:   time.Now().Format(time.RFC3339),
	}

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

	if jobMessage.Footer != "" {
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: jobMessage.Footer,
		}
	}

	return embed
}

func InitializeAdvertisingStaff(session *discordgo.Session) (*AdvertisingStaffManager) {
	manager, err := NewAdvertisingStaffManager(session)
	if err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "advertising_staff.go", true, err, "Failed to create advertising staff manager")
		return nil
	}

	if err := manager.Start(); err != nil {
		utils.LogAndNotifyAdmins(session, "high", "Error", "advertising_staff.go", true, err, "Failed to start advertising staff scheduler")
		return nil
	}

	return manager
}