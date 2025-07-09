package discord

import (
	"log"
	"os"
	"bot/database"
	"bot/utils"
	"bot/handlers/tracking"
	"bot/handlers/quiz"
	"bot/handlers/weekly_updates"
	"bot/handlers/advertising/staff"
	"bot/handlers/discord_administration/channel/voice"
	"bot/handlers/discord_administration/channel/text"	

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func StartBot() error {
	Token := os.Getenv("DISCORD_BOT_TOKEN")
	if Token == "" {
		log.Fatalf("Bot-Token nicht gefunden!")
	}

	// Tracking-Handler instanzieren
	inviteTracker := tracking.NewInviteTracker(database.DB)
	leaveTracker := tracking.NewLeaveTracker(database.DB)
	voiceTracker := tracking.NewVoiceTracker(database.DB)
	msgTracker := tracking.NewMessageTracker(database.DB)
	voiceVis := discord_administration_channel_voice.NewVoiceVisibilityTracker(database.DB)

	// Creation Discord-Session
	dg, err := discordgo.New("Bot " + Token)
	if err != nil {
		return err
	}

	// Register Bot-Intents
	dg.Identify.Intents = discordgo.IntentsAll

	// Register Event-Handler
	dg.AddHandler(ready)
	dg.AddHandler(interactionHandler)

	// Register Tracking-Handler
	dg.AddHandler(inviteTracker.OnReady)
	dg.AddHandler(inviteTracker.OnGuildMemberAdd)
	dg.AddHandler(leaveTracker.OnGuildMemberRemove)
	dg.AddHandler(voiceTracker.OnVoiceStateUpdate)
	dg.AddHandler(msgTracker.OnMessageCreate)
	
	// TimedPurger (Regelmäßiges Löschen von alten Nachrichten in bestimmten Kanälen)
	discord_administration_channel_text.StartChannelPurger(dg)

	// Voice Visibility Tracker
	dg.AddHandler(voiceVis.OnVoiceStateUpdate)

	// Register Quiz Handler
	quiz.RegisterQuiz(dg)

	// Connection Discord-API
	err = dg.Open()
	if err != nil {
		return err
	}

	// Command register
	RegisterCommands(dg)

	// Weekly Updates Handler
	weeklyManager, err := weekly_updates.InitializeWeeklyUpdates(database.DB, dg)
	if err != nil {
		utils.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 0, err, "Fehler beim Initialisieren der wöchentlichen Berichte")
	}

	// Test Weekly Updates Scheduler
	if os.Getenv("WEEKLY_GENERATE_REPORTS_NOW") == "true" {
		if err := weeklyManager.GenerateReportsNow(); err != nil {
			utils.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 0, err, "Fehler beim TEST von Generieren der wöchentlichen Berichte")
		}
	}

	// Advertising-Staff Handler initialisieren
	advertisingManager, err := staff.InitializeAdvertisingStaff(dg)
	if err != nil {
		utils.LogAndNotifyAdmins(dg, "Mittel", "Error", "bot.go", 0, err, "Fehler beim Initialisieren des Advertising-Staff Handlers")
	}

	// Test Advertising System (falls gewünscht)
	if os.Getenv("ADVERTISING_TEST_SEND_NOW") == "true" {
		if err := advertisingManager.SendNow(); err != nil {
			utils.LogAndNotifyAdmins(dg, "Mittel", "Error", "bot.go", 0, err, "Fehler beim TEST-Senden der Stellenausschreibung")
		}
	}

	// Stauts-Update "Bot is online"
	log.Println("Bot has been started and successfully connected to Discord!")
	
	// Bot start Info
	utils.LogAndNotifyAdmins(dg, "Keine", "Info", "bot.go", 0, nil, "Bot gestartet")

	select {}
}


