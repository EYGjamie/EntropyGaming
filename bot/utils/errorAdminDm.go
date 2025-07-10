package utils

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

// LogAndNotifyAdmins logs an error with a given priority and type, and optionally sends a notification to admins via DM.
// priority can be "critical", "high", "medium", "low", "warn", or "info".
// msgType is the type of message, e.g., "Error", "Warning", etc.
// file is the name of the file where the error occurred.
// notfication determines whether to send a DM to admins.
// err is the error to log and notify about.
// contextMsg is an optional message providing additional context about the error.
func LogAndNotifyAdmins(bot *discordgo.Session, priority string, msgType string, file string, notfication bool, err error, contextMsg string) {
	if err == nil {
		err = fmt.Errorf("no error provided")
	}

	// create day based log files
	logDir := filepath.Join("logs")
	if mkErr := os.MkdirAll(logDir, 0755); mkErr != nil {
		log.Printf("Error creating logs folder %v", mkErr)
	} else {
		today := time.Now().Format("2006-01-02")
		logFilePath := filepath.Join(logDir, fmt.Sprintf("%s.log", today))
		f, openErr := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if openErr != nil {
			log.Printf("Error open log file %s: %v", logFilePath, openErr)
		} else {
			defer f.Close()
			logger := log.New(f, "", log.LstdFlags)
			logger.Printf("[ADMIN-ALERT] %s/%s %s %v", priority, msgType, file, err)
		}
	}

	// if notfication is true, we additionally send a DM to admins
	if notfication {
		// => DBMIGRATION
		adminEnv := os.Getenv("ADMIN_IDS")
		if adminEnv == "" {
			log.Println("ADMIN_IDS not set, cannot notify admins")
			return
		}
		adminIDs := strings.Split(adminEnv, ",")

		var embedColor int
		switch priority {
			case "critical":
				embedColor = 0xff008c // pink
			case "warn":
				embedColor = 0xFF00FF // magenta
			case "high":
				embedColor = 0xFF0000 // red
			case "medium":
				embedColor = 0xFFA500 // orange
			case "low":
				embedColor = 0xFFFF00 // yellow
			case "info":
				embedColor = 0x0000FF // blue
			default:
				embedColor = 0x00ff00 // grey
			}

		embed := &discordgo.MessageEmbed{
			Title: fmt.Sprintf("Prio: %s — Typ: %s", priority, msgType),
			Color: embedColor,
			Fields: []*discordgo.MessageEmbedField{
				{Name: "File", Value: file, Inline: true},
				{Name: "Time", Value: time.Now().Format(time.RFC3339), Inline: true},
			},
		}
		if contextMsg != "" {
			embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{
				Name:   "Context",
				Value:  contextMsg,
				Inline: false,
			})
		}
		embed.Fields = append(embed.Fields, &discordgo.MessageEmbedField{
			Name:   "Error",
			Value:  err.Error(),
			Inline: false,
		})

		for _, adminID := range adminIDs {
			adminID = strings.TrimSpace(adminID)
			if adminID == "" {
				continue
			}
			dmChannel, dmErr := bot.UserChannelCreate(adminID)
			if dmErr != nil {
				log.Printf("Error creating DM channel with Admin: %s: %v", adminID, dmErr)
				continue
			}
			if _, sendErr := bot.ChannelMessageSendEmbed(dmChannel.ID, embed); sendErr != nil {
				log.Printf("Error senden msg to Admin: %s: %v", adminID, sendErr)
			}
		}
	}	
}
