package weekly_updates

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/robfig/cron/v3"
)

// Scheduler manages the weekly report generation and sending
type Scheduler struct {
	cron        *cron.Cron
	dataService *DataService
	chartService *ChartService
	sender      *DiscordSender
	config      *EnvConfig
}

// NewScheduler creates a new scheduler instance
func NewScheduler(db *sql.DB, session *discordgo.Session, config *EnvConfig) *Scheduler {
	dataService := NewDataService(db, config.TableName)
	chartService := NewChartService(config.ReportsDir)
	sender := NewDiscordSender(session, config.ReportsDir)

	// Create cron with timezone support
	location, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		log.Printf("Warning: Could not load Berlin timezone, using UTC: %v", err)
		location = time.UTC
	}

	c := cron.New(cron.WithLocation(location))

	return &Scheduler{
		cron:         c,
		dataService:  dataService,
		chartService: chartService,
		sender:       sender,
		config:       config,
	}
}

// Start begins the weekly report scheduler
func (s *Scheduler) Start() error {
	// Use configurable cron spec with error handling wrapper
	_, err := s.cron.AddFunc(s.config.CronSpec, func() {
		if err := s.generateAndSendReports(); err != nil {
			log.Printf("Error generating and sending weekly reports: %v", err)
		}
	})
	if err != nil {
		return fmt.Errorf("failed to schedule weekly reports with spec %s: %w", s.config.CronSpec, err)
	}

	s.cron.Start()
	return nil
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	s.cron.Stop()
}

// GenerateAndSendNow generates and sends reports immediately (for testing)
func (s *Scheduler) GenerateAndSendNow() error {
	return s.generateAndSendReports()
}

// generateAndSendReports is the main function that generates and sends weekly reports
func (s *Scheduler) generateAndSendReports() error {

	now := time.Now()
	timeRanges := GetTimeRanges(now)

	// Fetch data for all time ranges
	data := make(map[string]map[string]int)
	
	for key, timeRange := range timeRanges {
		var since, before *time.Time
		
		if !timeRange.Start.IsZero() {
			since = &timeRange.Start
		}
		if !timeRange.End.IsZero() {
			before = &timeRange.End
		}

		counts, err := s.dataService.FetchCounts(since, before)
		if err != nil {
			return fmt.Errorf("failed to fetch counts for %s: %w", key, err)
		}
		
		data[key] = counts
	}

	// Get earliest timestamp for overview
	earliest, err := s.dataService.FetchEarliestTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get earliest timestamp: %w", err)
	}

	// Generate charts
	if err := s.generateAllCharts(data, timeRanges, earliest, now); err != nil {
		return fmt.Errorf("failed to generate charts: %w", err)
	}

	// Send reports
	if err := s.sender.SendWeeklyReports(s.config.UserIDs); err != nil {
		return fmt.Errorf("failed to send reports: %w", err)
	}

	log.Println("Weekly report generation completed successfully")
	return nil
}

// generateAllCharts generates all required charts
func (s *Scheduler) generateAllCharts(data map[string]map[string]int, timeRanges map[string]TimeRange, earliest *time.Time, now time.Time) error {
	
	// 1. Weekly distribution charts
	weeklyData := ChartData{
		Counts:    data["lastWeek"],
		TimeRange: timeRanges["lastWeek"],
		Title:     "Letzte Woche",
		Filename:  "weekly_distribution.png",
	}
	if err := s.chartService.GenerateWeeklyDistribution(weeklyData); err != nil {
		return fmt.Errorf("failed to generate weekly distribution: %w", err)
	}

	// 2. Comparison: Previous week vs Last week
	prevWeekComp := ComparisonData{
		DataA:    data["prevWeek"],
		DataB:    data["lastWeek"],
		TimeA:    timeRanges["prevWeek"],
		TimeB:    timeRanges["lastWeek"],
		Title:    "Vorletzte Woche vs. Letzte Woche",
		Filename: "comp_prevweek_lastweek.png",
	}
	if err := s.chartService.GenerateComparison(prevWeekComp); err != nil {
		return fmt.Errorf("failed to generate prev week comparison: %w", err)
	}

	// 3. Comparison: Last month vs Last week
	monthComp := ComparisonData{
		DataA:    data["lastMonth"],
		DataB:    data["lastWeek"],
		TimeA:    timeRanges["lastMonth"],
		TimeB:    timeRanges["lastWeek"],
		Title:    "Letzter Monat vs. Letzte Woche",
		Filename: "comp_lastmonth_lastweek.png",
	}
	if err := s.chartService.GenerateComparison(monthComp); err != nil {
		return fmt.Errorf("failed to generate month comparison: %w", err)
	}

	// 4. Comparison: Before last week vs Last week
	beforeComp := ComparisonData{
		DataA:    data["beforeWeek"],
		DataB:    data["lastWeek"],
		TimeA:    timeRanges["beforeWeek"],
		TimeB:    timeRanges["lastWeek"],
		Title:    "Historisch vs. Letzte Woche",
		Filename: "comp_before_lastweek.png",
	}
	if err := s.chartService.GenerateComparison(beforeComp); err != nil {
		return fmt.Errorf("failed to generate before comparison: %w", err)
	}

	// 5. Overview chart with all data
	if earliest != nil {
		allData, err := s.dataService.FetchCounts(nil, nil)
		if err != nil {
			return fmt.Errorf("failed to fetch all data for overview: %w", err)
		}

		overviewData := ChartData{
			Counts: allData,
			TimeRange: TimeRange{
				Start: *earliest,
				End:   now,
				Label: "Gesamtübersicht",
			},
			Title:    "Gesamtübersicht",
			Filename: "overview.png",
		}
		if err := s.chartService.GenerateOverview(overviewData); err != nil {
			return fmt.Errorf("failed to generate overview: %w", err)
		}
	}

	return nil
}