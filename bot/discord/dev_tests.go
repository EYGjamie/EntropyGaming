package discord

import (
	"bot/utils"
	"bot/handlers/weekly_updates"
	"bot/handlers/advertising/staff"

	"github.com/bwmarrin/discordgo"
)

func DevTests(dg *discordgo.Session, weeklyManager *weekly_updates.WeeklyUpdatesManager, advertisingManager *staff.AdvertisingStaffManager) {

	/*==================================================================*/
	// Var for activating Tests
	/*==================================================================*/

	var GENERATE_WEEKLY_REPORTS_TEST = false
	var STAFF_ADVERTISING_TEST = true

	/*==================================================================*/
	// Tests
	/*==================================================================*/

	if GENERATE_WEEKLY_REPORTS_TEST {
		if err := weeklyManager.GenerateReportsNow(); err != nil {
			utils.LogAndNotifyAdmins(dg, "warn", "Warnung", "dev_tests.go", true, err, "Error generating weekly reports in dev TEST")
		}
	}

	if STAFF_ADVERTISING_TEST {
		if err := advertisingManager.SendNow(); err != nil {
			utils.LogAndNotifyAdmins(dg, "warn", "Warnung", "dev_tests.go", true, err, "Error sending staff advertising in dev TEST")
		}
	}
}

