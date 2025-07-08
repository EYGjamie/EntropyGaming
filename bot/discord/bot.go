package discord

import (
	"log"
	"os"
	"strings"
	"bot/database"
	"bot/handlers/staffmember"
	"bot/handlers/surveys"
	"bot/handlers/tickets"
	"bot/handlers/discord_administration"
	"bot/handlers/tracking"
	"bot/handlers/quiz"
	"bot/handlers/weekly_updates"

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
	voiceVis := discord_administration.NewVoiceVisibilityTracker(database.DB)
	

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
	discord_administration.StartChannelPurger(dg)

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
		discord_administration.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 74, err, "Fehler beim Initialisieren der wöchentlichen Berichte")
	}

	// Test Weekly Updates Scheduler
	if os.Getenv("WEEKLY_GENERATE_REPORTS_NOW") == "true" {
		if err := weeklyManager.GenerateReportsNow(); err != nil {
			discord_administration.LogAndNotifyAdmins(dg, "Fehler", "Wöchentlichen Berichte", "bot.go", 80, err, "Fehler beim TEST von Generieren der wöchentlichen Berichte")
		}
	}

	// Stauts-Update "Bot is online"
	log.Println("Bot has been started and successfully connected to Discord!")
	
	// Bot start Info
	discord_administration.LogAndNotifyAdmins(dg, "Keine", "Info", "bot.go", 77, nil, "Bot gestartet")

	select {}
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// ready-Handler wird noch ausgelagert in ready.go
func ready(s *discordgo.Session, event *discordgo.Ready) {
	staffmember.StartRoleUpdater(s, database.DB, os.Getenv("GUILD_ID"))           				// Starting Role-Updater for Database
	tickets.CheckAndNotifyInactiveUsers(s, database.DB, os.Getenv("GUILD_ID")) 					// Starting Inaktive-User-Notifier 
	// tickets.StartTicketStatusUpdater(s, database.DB, os.Getenv("CHANNEL_TICKET_STATUS_ID"))   	// Starting Ticket-Status-Updater
	log.Printf("Bot logged in as %s#%s", event.User.Username, event.User.Discriminator) 		// Stauts-Update "Bot is working"

	
}

/*--------------------------------------------------------------------------------------------------------------------------*/
