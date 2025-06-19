package weekly_updates

import (
	"database/sql"
	"fmt"
	"time"
)

// DataService handles database operations
type DataService struct {
	db        *sql.DB
	tableName string
}

// NewDataService creates a new DataService
func NewDataService(db *sql.DB, tableName string) *DataService {
	return &DataService{
		db:        db,
		tableName: tableName,
	}
}

// FetchCounts retrieves counts from database for given time range
func (ds *DataService) FetchCounts(since, before *time.Time) (map[string]int, error) {
	var conditions []string
	var args []interface{}
	
	if since != nil {
		conditions = append(conditions, "timestamp >= ?")
		args = append(args, since.Unix())
	}
	
	if before != nil {
		conditions = append(conditions, "timestamp < ?")
		args = append(args, before.Unix())
	}
	
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + conditions[0]
		for i := 1; i < len(conditions); i++ {
			whereClause += " AND " + conditions[i]
		}
	}
	
	query := fmt.Sprintf("SELECT answer, COUNT(*) FROM %s %s GROUP BY answer", ds.tableName, whereClause)
	
	rows, err := ds.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query database: %w", err)
	}
	defer rows.Close()
	
	counts := make(map[string]int)
	
	for rows.Next() {
		var answer string
		var count int
		
		if err := rows.Scan(&answer, &count); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		
		// Map to known keys or "other"
		key := answer
		if !KnownKeys[answer] {
			key = "other"
		}
		
		label := LabelMap[key]
		counts[label] += count
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}
	
	return counts, nil
}

// FetchEarliestTimestamp gets the earliest timestamp from the database
func (ds *DataService) FetchEarliestTimestamp() (*time.Time, error) {
	query := fmt.Sprintf("SELECT MIN(timestamp) FROM %s", ds.tableName)
	
	var timestamp sql.NullInt64
	err := ds.db.QueryRow(query).Scan(&timestamp)
	if err != nil {
		return nil, fmt.Errorf("failed to query earliest timestamp: %w", err)
	}
	
	if !timestamp.Valid {
		return nil, nil
	}
	
	t := time.Unix(timestamp.Int64, 0)
	return &t, nil
}

// GetTimeRanges calculates all needed time ranges for reports
func GetTimeRanges(now time.Time) map[string]TimeRange {
	weekAgo := now.AddDate(0, 0, -7)
	twoWeeksAgo := now.AddDate(0, 0, -14)
	monthAgo := now.AddDate(0, 0, -30)
	
	return map[string]TimeRange{
		"lastWeek": {
			Start: weekAgo,
			End:   now,
			Label: "Letzte Woche",
		},
		"prevWeek": {
			Start: twoWeeksAgo,
			End:   weekAgo,
			Label: "Vorletzte Woche",
		},
		"lastMonth": {
			Start: monthAgo,
			End:   weekAgo,
			Label: "Letzter Monat",
		},
		"beforeWeek": {
			Start: time.Time{}, // Will be handled as no start limit
			End:   weekAgo,
			Label: "Historisch bis vor letzter Woche",
		},
	}
}

// FormatDate formats timestamp to German date format
func FormatDate(t time.Time) string {
	return fmt.Sprintf("%d. %s %s", 
		t.Day(), 
		MonthNames[int(t.Month())], 
		t.Format("06"))
}