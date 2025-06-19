package weekly_updates

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/bwmarrin/discordgo"
)

// DiscordSender handles sending reports via Discord
type DiscordSender struct {
	session    *discordgo.Session
	reportsDir string
}

// NewDiscordSender creates a new DiscordSender
func NewDiscordSender(session *discordgo.Session, reportsDir string) *DiscordSender {
	return &DiscordSender{
		session:    session,
		reportsDir: reportsDir,
	}
}

// SendWeeklyReports sends all generated reports to specified users
func (ds *DiscordSender) SendWeeklyReports(userIDs []string) error {
	// Define the order of reports to send (same as Python version)
	reportOrder := []string{
		"weekly_distribution_abs.png",
		"weekly_distribution_rel.png", 
		"comp_prevweek_lastweek.png",
		"comp_lastmonth_lastweek.png",
		"comp_before_lastweek.png",
		"overview.png",
	}

	for _, userID := range userIDs {
		if err := ds.sendReportsToUser(userID, reportOrder); err != nil {
			return fmt.Errorf("failed to send reports to user %s: %w", userID, err)
		}
	}

	return nil
}

// sendReportsToUser sends all reports to a single user
func (ds *DiscordSender) sendReportsToUser(userID string, reportOrder []string) error {
	// Open DM channel with user
	channel, err := ds.session.UserChannelCreate(userID)
	if err != nil {
		return fmt.Errorf("failed to create DM channel: %w", err)
	}

	// Send each report in order
	for _, filename := range reportOrder {
		path := filepath.Join(ds.reportsDir, filename)
		
		// Check if file exists
		if _, err := os.Stat(path); os.IsNotExist(err) {
			continue // Skip missing files
		}

		if err := ds.sendFile(channel.ID, path, filename); err != nil {
			return fmt.Errorf("failed to send file %s: %w", filename, err)
		}
	}

	return nil
}

// sendFile sends a single file to a Discord channel
func (ds *DiscordSender) sendFile(channelID, filePath, filename string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Create message with file attachment
	_, err = ds.session.ChannelFileSend(channelID, filename, file)
	if err != nil {
		return fmt.Errorf("failed to send file to Discord: %w", err)
	}

	return nil
}

// SendToChannel sends reports to a specific channel instead of DMs
func (ds *DiscordSender) SendToChannel(channelID string) error {
	reportOrder := []string{
		"weekly_distribution_abs.png",
		"weekly_distribution_rel.png",
		"comp_prevweek_lastweek.png", 
		"comp_lastmonth_lastweek.png",
		"comp_before_lastweek.png",
		"overview.png",
	}

	for _, filename := range reportOrder {
		path := filepath.Join(ds.reportsDir, filename)
		
		if _, err := os.Stat(path); os.IsNotExist(err) {
			continue
		}

		if err := ds.sendFile(channelID, path, filename); err != nil {
			return fmt.Errorf("failed to send file %s: %w", filename, err)
		}
	}

	return nil
}