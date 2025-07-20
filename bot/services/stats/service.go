package stats

import (
	"bot/database"
	"bot/utils"
	"database/sql"
	"fmt"
	"time"

	"github.com/bwmarrin/discordgo"
)

type StatsService struct {
	bot *discordgo.Session
	db  *sql.DB
}

type ServerStats struct {
	DiscordMembers     int    `json:"discord_members"`
	DiamondClubMembers int    `json:"diamond_club_members"`
	Messages           int    `json:"messages"`
	VoiceTimeSeconds   int    `json:"voice_time_seconds"`
	FromDate          string `json:"from_date"`
	ToDate            string `json:"to_date"`
}

func NewStatsService(bot *discordgo.Session) *StatsService {
	return &StatsService{
		bot: bot,
		db:  database.DB,
	}
}

func (s *StatsService) GetServerStats(guildID string, fromDate, toDate time.Time) (*ServerStats, error) {
	stats := &ServerStats{
		FromDate: fromDate.Format("2006-01-02"),
		ToDate:   toDate.Format("2006-01-02"),
	}

	if err := s.getDiscordMemberCount(utils.GetIdFromDB(s.bot, "GUILD_ID"), stats); err != nil {
		utils.LogAndNotifyAdmins(s.bot, "high", "Error", "stats_service.go", true, err, "Fehler beim Abrufen der Discord Mitgliederanzahl")
		return nil, nil
	}

	if err := s.getDiamondClubMemberCount(stats); err != nil {
		utils.LogAndNotifyAdmins(s.bot, "high", "Error", "stats_service.go", true, err, "Fehler beim Abrufen der Diamond Club Mitglieder")
		return nil, nil
	}

	if err := s.getMessageCount(fromDate, toDate, stats); err != nil {
		utils.LogAndNotifyAdmins(s.bot, "high", "Error", "stats_service.go", true, err, "Fehler beim Abrufen der Nachrichtenanzahl")
		return nil, nil
	}

	if err := s.getVoiceTime(fromDate, toDate, stats); err != nil {
		utils.LogAndNotifyAdmins(s.bot, "high", "Error", "stats_service.go", true, err, "Fehler beim Abrufen der Voice Zeit")
		return nil, nil
	}

	return stats, nil
}

func (s *StatsService) GetDefaultTimeRange() (time.Time, time.Time) {
	return time.Now().AddDate(-10, 0, 0), time.Now()
}

func (s *StatsService) ParseTimeRange(fromStr, toStr string) (time.Time, time.Time) {
	fromDate, toDate := s.GetDefaultTimeRange()
	
	if fromStr != "" {
		if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
			fromDate = parsed
		}
	}
	
	if toStr != "" {
		if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
			toDate = parsed
		}
	}
	
	return fromDate, toDate
}

func (s *StatsService) getDiscordMemberCount(guildID string, stats *ServerStats) error {
	guild, err := s.bot.State.Guild(guildID)
	if err != nil || guild == nil {
		guild, err = s.bot.Guild(guildID)
		if err != nil {
			return err
		}
	}
	stats.DiscordMembers = guild.MemberCount
	return nil
}

func (s *StatsService) getDiamondClubMemberCount(stats *ServerStats) error {
	return s.db.QueryRow(`
		SELECT COUNT(*) FROM users 
		WHERE role_diamond_club = TRUE
	`).Scan(&stats.DiamondClubMembers)
}

func (s *StatsService) getMessageCount(fromDate, toDate time.Time, stats *ServerStats) error {
	return s.db.QueryRow(`
		SELECT COUNT(*) FROM log_messages 
		WHERE created_at BETWEEN ? AND ?
	`, fromDate, toDate).Scan(&stats.Messages)
}

func (s *StatsService) getVoiceTime(fromDate, toDate time.Time, stats *ServerStats) error {
	return s.db.QueryRow(`
		SELECT COALESCE(SUM(duration), 0) FROM log_voice 
		WHERE joined_at BETWEEN ? AND ?
	`, fromDate, toDate).Scan(&stats.VoiceTimeSeconds)
}

func FormatDuration(seconds int) string {
	if seconds < 60 {
		return fmt.Sprintf("%ds", seconds)
	}
	
	minutes := seconds / 60
	if minutes < 60 {
		return fmt.Sprintf("%dm %ds", minutes, seconds%60)
	}
	
	hours := minutes / 60
	if hours < 24 {
		return fmt.Sprintf("%dh %dm", hours, minutes%60)
	}
	
	days := hours / 24
	return fmt.Sprintf("%dd %dh %dm", days, hours%24, minutes%60)
}