package weekly_updates

import (
	"bot/utils"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

// EnvConfig holds configuration loaded from environment variables
type EnvConfig struct {
	UserIDs    []string
	TableName  string
	ReportsDir string
	CronSpec   string
}

// LoadEnvConfig loads configuration from environment variables
func LoadEnvConfig(bot *discordgo.Session) (*EnvConfig, error) {
	userIDsStr := utils.GetIdFromDB(bot, "WEEKLY_UPDATES_USER_IDS")
	userIDs := strings.Split(userIDsStr, ",")
	for i, id := range userIDs {
		userIDs[i] = strings.TrimSpace(id)
	}
	tableName := "survey_answers"	
	reportsDir := "reports"	
	cronSpec := utils.GetIdFromDB(bot, "WEEKLY_UPDATES_CRON_SPEC")
	return &EnvConfig{
		UserIDs:    userIDs,
		TableName:  tableName,
		ReportsDir: reportsDir,
		CronSpec:   cronSpec,
	}, nil
}

// SurveyCount represents count data for survey answers
type SurveyCount struct {
	Label string
	Count int
}

// TimeRange represents a time period for data analysis
type TimeRange struct {
	Start time.Time
	End   time.Time
	Label string
}

// ChartData holds data needed for chart generation
type ChartData struct {
	Counts    map[string]int
	TimeRange TimeRange
	Title     string
	Filename  string
}

// ComparisonData holds data for comparison charts
type ComparisonData struct {
	DataA     map[string]int
	DataB     map[string]int
	TimeA     TimeRange
	TimeB     TimeRange
	Title     string
	Filename  string
}

// LabelMap for German translations
var LabelMap = map[string]string{
	"discord":      "Discord",
	"gamertransfer": "Gamertransfer", 
	"social_media": "Social Media",
	"friends":      "Freunde",
	"other":        "Sonstige",
}

var KnownKeys = map[string]bool{
	"discord":      true,
	"gamertransfer": true,
	"social_media": true,
	"friends":      true,
	"other":        true,
}

var MonthNames = map[int]string{
	1: "Januar", 2: "Februar", 3: "März", 4: "April",
	5: "Mai", 6: "Juni", 7: "Juli", 8: "August", 
	9: "September", 10: "Oktober", 11: "November", 12: "Dezember",
}