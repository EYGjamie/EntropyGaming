package social_news

import (
	"database/sql"
	"fmt"
	"strings"
)

// DatabaseService handles all database operations
type DatabaseService struct {
	db *sql.DB
}

// NewDatabaseService creates a new database service
func NewDatabaseService(db *sql.DB) *DatabaseService {
	return &DatabaseService{db: db}
}

// InitializeTables creates the necessary database tables
func (ds *DatabaseService) InitializeTables() error {
	tables := []string{
		`CREATE TABLE IF NOT EXISTS social_creators (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			platform TEXT NOT NULL,
			channel_id TEXT NOT NULL,
			username TEXT NOT NULL,
			display_name TEXT,
			avatar_url TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(platform, channel_id)
		)`,
		`CREATE TABLE IF NOT EXISTS social_notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			creator_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			content_id TEXT NOT NULL,
			content_title TEXT,
			content_url TEXT,
			discord_message_id TEXT,
			discord_channel_id TEXT NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(creator_id) REFERENCES social_creators(id)
		)`,
		`CREATE TABLE IF NOT EXISTS social_content (
			id TEXT PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			platform TEXT NOT NULL,
			type TEXT NOT NULL,
			title TEXT,
			description TEXT,
			url TEXT,
			thumbnail_url TEXT,
			is_live BOOLEAN DEFAULT FALSE,
			viewer_count INTEGER DEFAULT 0,
			published_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(creator_id) REFERENCES social_creators(id)
		)`,
	}

	for _, table := range tables {
		if _, err := ds.db.Exec(table); err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}
	}

	return nil
}

// Creator CRUD operations
func (ds *DatabaseService) CreateCreator(creator *Creator) (*Creator, error) {
	query := `INSERT INTO social_creators (name, platform, channel_id, username, display_name, avatar_url, is_active)
			  VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, created_at, updated_at`
	
	err := ds.db.QueryRow(query, creator.Name, creator.Platform, creator.ChannelID, 
		creator.Username, creator.DisplayName, creator.AvatarURL, creator.IsActive).
		Scan(&creator.ID, &creator.CreatedAt, &creator.UpdatedAt)
	
	return creator, err
}

func (ds *DatabaseService) GetCreators(platform *Platform, activeOnly bool) ([]*Creator, error) {
	var query strings.Builder
	var args []interface{}
	
	query.WriteString("SELECT id, name, platform, channel_id, username, display_name, avatar_url, is_active, created_at, updated_at FROM social_creators WHERE 1=1")
	
	if platform != nil {
		query.WriteString(" AND platform = ?")
		args = append(args, string(*platform))
	}
	
	if activeOnly {
		query.WriteString(" AND is_active = TRUE")
	}
	
	query.WriteString(" ORDER BY created_at DESC")
	
	rows, err := ds.db.Query(query.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var creators []*Creator
	for rows.Next() {
		creator := &Creator{}
		err := rows.Scan(&creator.ID, &creator.Name, &creator.Platform, &creator.ChannelID,
			&creator.Username, &creator.DisplayName, &creator.AvatarURL, &creator.IsActive,
			&creator.CreatedAt, &creator.UpdatedAt)
		if err != nil {
			return nil, err
		}
		creators = append(creators, creator)
	}
	
	return creators, nil
}

func (ds *DatabaseService) UpdateCreator(creator *Creator) error {
	query := `UPDATE social_creators SET name = ?, display_name = ?, avatar_url = ?, 
			  is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	
	_, err := ds.db.Exec(query, creator.Name, creator.DisplayName, creator.AvatarURL, 
		creator.IsActive, creator.ID)
	return err
}

func (ds *DatabaseService) DeleteCreator(id int) error {
	_, err := ds.db.Exec("DELETE FROM social_creators WHERE id = ?", id)
	return err
}

// Notification operations
func (ds *DatabaseService) CreateNotification(notification *Notification) (*Notification, error) {
	query := `INSERT INTO social_notifications (creator_id, type, content_id, content_title, 
			  content_url, discord_message_id, discord_channel_id, is_active)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, created_at`
	
	err := ds.db.QueryRow(query, notification.CreatorID, notification.Type, 
		notification.ContentID, notification.ContentTitle, notification.ContentURL,
		notification.DiscordMessageID, notification.DiscordChannelID, notification.IsActive).
		Scan(&notification.ID, &notification.CreatedAt)
	
	return notification, err
}

func (ds *DatabaseService) GetActiveNotifications(notificationType NotificationType) ([]*Notification, error) {
	query := `SELECT id, creator_id, type, content_id, content_title, content_url, 
			  discord_message_id, discord_channel_id, is_active, created_at 
			  FROM social_notifications WHERE type = ? AND is_active = TRUE`
	
	rows, err := ds.db.Query(query, string(notificationType))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var notifications []*Notification
	for rows.Next() {
		notification := &Notification{}
		err := rows.Scan(&notification.ID, &notification.CreatorID, &notification.Type,
			&notification.ContentID, &notification.ContentTitle, &notification.ContentURL,
			&notification.DiscordMessageID, &notification.DiscordChannelID, 
			&notification.IsActive, &notification.CreatedAt)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, notification)
	}
	
	return notifications, nil
}

func (ds *DatabaseService) DeactivateNotification(id int) error {
	_, err := ds.db.Exec("UPDATE social_notifications SET is_active = FALSE WHERE id = ?", id)
	return err
}

func (ds *DatabaseService) DeactivateNotificationByContentID(contentID string) error {
	_, err := ds.db.Exec("UPDATE social_notifications SET is_active = FALSE WHERE content_id = ?", contentID)
	return err
}