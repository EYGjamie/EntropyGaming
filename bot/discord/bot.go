package discord

import (
	"bot/database"
	"bot/handlers/advertising/staff"
	"bot/handlers/discord_administration/channel/text"
	"bot/handlers/discord_administration/channel/voice"
	"bot/handlers/quiz"
	"bot/handlers/tracking"
	"bot/handlers/weekly_updates"
	"bot/utils"
	"log"
	"os"

	"github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

func StartBot() error {
	isProd := os.Getenv("IS_PROD")
	var Token string
	if isProd == "true" {
		Token = os.Getenv("DISCORD_BOT_TOKEN_PROD")
	} else {
		Token = os.Getenv("DISCORD_BOT_TOKEN_DEV")
	}
	if Token == "" {
		log.Fatalf("Bot-Token nicht gefunden!")
		os.Exit(0)
	}

	// Tracking-Handler instanzieren
	inviteTracker := tracking.NewInviteTracker(database.DB)
	leaveTracker := tracking.NewLeaveTracker(database.DB)
	voiceTracker := tracking.NewVoiceTracker(database.DB)
	msgTracker := tracking.NewMessageTracker(database.DB)
	voiceVis := discord_administration_channel_voice.NewVoiceVisibilityTracker(database.DB)

	// Creation Discord-Session
	bot, err := discordgo.New("Bot " + Token)
	if err != nil {
		return err
	}

	// Register Bot-Intents
	bot.Identify.Intents = discordgo.IntentsAll

	// Register Event-Handler
	bot.AddHandler(ready)
	bot.AddHandler(interactionHandler)

	// Register Tracking-Handler
	bot.AddHandler(inviteTracker.OnReady)
	bot.AddHandler(inviteTracker.OnGuildMemberAdd)
	bot.AddHandler(leaveTracker.OnGuildMemberRemove)
	bot.AddHandler(voiceTracker.OnVoiceStateUpdate)
	bot.AddHandler(msgTracker.OnMessageCreate)
	
	// TimedPurger (Regelmäßiges Löschen von alten Nachrichten in bestimmten Kanälen)
	discord_administration_channel_text.StartChannelPurger(bot)

	// Voice Visibility Tracker
	bot.AddHandler(voiceVis.OnVoiceStateUpdate)

	// Register Quiz Handler
	quiz.RegisterQuiz(bot)

	// Weekly Updates Handler
	weekleyUpdateManager := weekly_updates.InitializeWeeklyUpdates(database.DB, bot)

	// Advertising-Staff Handler initialisieren
	staffAdvertisingManager:= advertising_staff.InitializeAdvertisingStaff(bot)

	// Connection Discord-API
	err = bot.Open()
	if err != nil {
		return err
	}

	// Command register
	RegisterCommands(bot)

	// Stauts-Update "Bot is online"
	log.Println("Bot has been started and successfully connected to Discord!")

	// Bot start Info
	utils.LogAndNotifyAdmins(bot, "info", "Info", "bot.go", true, nil, "Bot has been started and successfully connected to Discord!")

	// Dev Tests
	if os.Getenv("DEV_TESTS") == "true" {
		DevTests(bot, weekleyUpdateManager, staffAdvertisingManager)
		utils.LogAndNotifyAdmins(bot, "info", "Info", "bot.go", true, nil, "Dev Tests executed successfully.")
	}

	select {}
}


