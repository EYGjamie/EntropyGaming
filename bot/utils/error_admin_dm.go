package utils

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

// LogAndNotifyAdmins loggt den Fehler in eine tagesbasierte Logdatei und sendet ein Embed an Admins
// priority: Pflicht, Auswahl: "Keine", "Niedrig", "Mittel", "Hoch"
// msgType: Pflicht, Auswahl: "Info", "Warn", "Error"
// file: Pflicht, Dateiname oder Pfad
// line: Pflicht, Zeilennummer in der Datei
// err: Pflicht, das Fehlermeldung-Error-Objekt
// contextMsg: Optional, zusätzliche Informationen

func LogAndNotifyAdmins(s *discordgo.Session, priority string, msgType string, file string, line int, err error, contextMsg string) {
	if err == nil {
		err = fmt.Errorf("kein Fehler angegeben/vorhanden")
	}

	// Farbe basierend auf Priorität festlegen
	var embedColor int
	switch priority {
	case "Hoch":
		embedColor = 0xFF0000 // Rot
	case "Mittel":
		embedColor = 0xFFA500 // Orange
	case "Niedrig":
		embedColor = 0xFFFF00 // Gelb
	default: // "Keine"
		embedColor = 0x00ff00 // Grau
	}

	// tagesbasiertes Logging in logs-Ordner
	logDir := "logs"
	if mkErr := os.MkdirAll(logDir, 0755); mkErr != nil {
		log.Printf("Fehler beim Erstellen des Log-Ordners: %v", mkErr)
	} else {
		today := time.Now().Format("2006-01-02")
		logFilePath := filepath.Join(logDir, fmt.Sprintf("%s.log", today))
		f, openErr := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if openErr != nil {
			log.Printf("Fehler beim Öffnen der Logdatei %s: %v", logFilePath, openErr)
		} else {
			defer f.Close()
			logger := log.New(f, "", log.LstdFlags)
			logger.Printf("[ADMIN-ALERT] %s/%s %s:%d %v", priority, msgType, file, line, err)
		}
	}

	// Admin-IDs aus Umgebungsvariable lesen (mit Komma getrennt)
	adminEnv := os.Getenv("ADMIN_IDS")
	if adminEnv == "" {
		log.Println("ADMIN_IDS nicht gesetzt")
		return
	}
	adminIDs := strings.Split(adminEnv, ",")

	// Embed erstellen
	embed := &discordgo.MessageEmbed{
		Title: fmt.Sprintf("Prio: %s — Typ: %s", priority, msgType),
		Color: embedColor,
		Fields: []*discordgo.MessageEmbedField{
			{Name: "Datei", Value: file, Inline: true},
			{Name: "Zeile", Value: strconv.Itoa(line), Inline: true},
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
		Name:   "Fehlermeldung",
		Value:  err.Error(),
		Inline: false,
	})

	// DM an Admins senden
	for _, adminID := range adminIDs {
		adminID = strings.TrimSpace(adminID)
		if adminID == "" {
			continue
		}
		dmChannel, dmErr := s.UserChannelCreate(adminID)
		if dmErr != nil {
			log.Printf("Fehler beim Erstellen des DM-Kanals für Admin %s: %v", adminID, dmErr)
			continue
		}
		if _, sendErr := s.ChannelMessageSendEmbed(dmChannel.ID, embed); sendErr != nil {
			log.Printf("Fehler beim Senden der Admin-DM an %s: %v", adminID, sendErr)
		}
	}
}
