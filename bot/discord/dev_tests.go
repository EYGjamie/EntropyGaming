package discord

import (
	"bot/utils"
	"bot/handlers/weekly_updates"
	"bot/handlers/advertising/staff"

	"github.com/bwmarrin/discordgo"
)

func DevTests(bot *discordgo.Session, weeklyUpdateManager *weekly_updates.WeeklyUpdatesManager, staffAdvertisingManager *advertising_staff.AdvertisingStaffManager) {

	/*==================================================================*/
	// Var for activating Tests
	/*==================================================================*/

	var GENERATE_WEEKLY_REPORTS_TEST = false
	var STAFF_ADVERTISING_TEST = true

	/*==================================================================*/
	// Tests
	/*==================================================================*/

	if GENERATE_WEEKLY_REPORTS_TEST {
		if err := weeklyUpdateManager.GenerateReportsNow(); err != nil {
			utils.LogAndNotifyAdmins(bot, "warn", "Warnung", "dev_tests.go", true, err, "Error generating weekly reports in dev TEST")
		}
	}

	if STAFF_ADVERTISING_TEST {
		if err := staffAdvertisingManager.SendNow(); err != nil {
			utils.LogAndNotifyAdmins(bot, "warn", "Warnung", "dev_tests.go", true, err, "Error sending staff advertising in dev TEST")
		}
	}
}

