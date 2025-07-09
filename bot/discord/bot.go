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

	// Weekly Updates Handler
	weekleyManager := weekly_updates.InitializeWeeklyUpdates(database.DB, dg)

	// Advertising-Staff Handler initialisieren
	advertisingManager:= staff.InitializeAdvertisingStaff(dg)

	// Connection Discord-API
	err = dg.Open()
	if err != nil {
		return err
	}

	// Command register
	RegisterCommands(dg)

	// Stauts-Update "Bot is online"
	log.Println("Bot has been started and successfully connected to Discord!")

	// Bot start Info
	utils.LogAndNotifyAdmins(dg, "info", "Info", "bot.go", true, nil, "Bot has been started and successfully connected to Discord!")

	// Dev Tests
	if os.Getenv("DEV_TESTS") == "true" {
		DevTests(dg, weekleyManager, advertisingManager)
		utils.LogAndNotifyAdmins(dg, "info", "Info", "bot.go", true, nil, "Dev Tests executed successfully.")
	}

	select {}
}


