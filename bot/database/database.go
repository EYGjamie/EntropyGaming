package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	dbPath := os.Getenv("DATABASE_PATH_PROD")
	if os.Getenv("IS_PROD") != "true" {
		dbPath = os.Getenv("DATABASE_PATH_DEV")
	}
	if dbPath == "" {
		log.Fatalf("Datenbankpfad nicht gefunden!")
		os.Exit(1)
	}
	DB, err = sql.Open("sqlite3", dbPath)

	if err != nil {
		log.Fatalf("Fehler beim Öffnen der Datenbank: %v", err)
	}
	createTables()
}

func createTables() {

	/*==============================================*/
	// TICKET TABLE
	/*==============================================*/

	ticketTable := `
		CREATE TABLE IF NOT EXISTS tickets (
			ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
			ticket_status TEXT DEFAULT "open",
			ticket_bereich TEXT,
			ticket_channel_id BIGINT,
			ticket_ersteller_id BIGINT,
			ticket_ersteller_name TEXT,
			ticket_erstellungszeit DEFAULT 0,
			ticket_bearbeiter_id BIGINT,
			ticket_bearbeiter_name TEXT,
			ticket_bearbeitungszeit BIGINT DEFAULT 0,
			ticket_schliesser_id BIGINT,
			ticket_schliesser_name TEXT,
			ticket_schliesszeit BIGINT DEFAULT 0,
			ticket_loescher_id BIGINT,
			ticket_loescher_name TEXT,
			ticket_loeschzeit BIGINT DEFAULT 0,
			ticket_modal_field_one TEXT,
			ticket_modal_field_two TEXT,
			ticket_modal_field_three TEXT,
			ticket_modal_field_four TEXT,
			ticket_modal_field_five TEXT,
			ticket_transcript TEXT
		);
		`

	_, err := DB.Exec(ticketTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der tickets-Tabelle: %v", err)
	}

	/*==============================================*/
	// TEAM AREAS TABLE
	/*==============================================*/

	team_areasTable := `
		CREATE TABLE IF NOT EXISTS team_areas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			team_name     TEXT    NOT NULL,
			game          TEXT    NOT NULL,
			role_id       TEXT    NOT NULL,
			category_id   TEXT    NOT NULL,
			voicechannel_id TEXT  NOT NULL,
			is_active     TEXT    DEFAULT true
		);
		`

	_, err = DB.Exec(team_areasTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der team_areas-Tabelle: %v", err)
	}

	/*==============================================*/
	// TEAM MEMBERS TABLE
	/*==============================================*/

	team_membersTable := `
		CREATE TABLE IF NOT EXISTS team_members (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			team_id  INTEGER NOT NULL,
			user_id  INTEGER NOT NULL,
			joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(team_id) REFERENCES team_areas(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(team_id, user_id)
		);

		CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
		CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
		CREATE INDEX IF NOT EXISTS idx_team_members_joined_at ON team_members(joined_at);
		CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
		`

	_, err = DB.Exec(team_membersTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der team_members-Tabelle: %v", err)
	}

	/*==============================================*/
	// LOG TABLES
	/*==============================================*/

	// zentrale User-Tabelle  
	usersTable := `
		PRAGMA foreign_keys = ON;
		CREATE TABLE IF NOT EXISTS users (
			id                      INTEGER PRIMARY KEY AUTOINCREMENT,
			discord_id              TEXT UNIQUE NOT NULL,
			username                TEXT,
			display_name            TEXT,
			nickname                TEXT,
			avatar_url              TEXT,
			is_bot                  BOOLEAN DEFAULT FALSE,
			joined_server_at        DATETIME,
			first_seen              DATETIME DEFAULT (CURRENT_TIMESTAMP),
			last_seen               DATETIME DEFAULT (CURRENT_TIMESTAMP),
			
			-- Rollen Boolean Spalten
			role_diamond_club       BOOLEAN DEFAULT FALSE,
			role_diamond_teams      BOOLEAN DEFAULT FALSE,
			role_entropy_member     BOOLEAN DEFAULT FALSE,
			role_management         BOOLEAN DEFAULT FALSE,
			role_developer          BOOLEAN DEFAULT FALSE,
			role_head_management    BOOLEAN DEFAULT FALSE,
			role_projektleitung     BOOLEAN DEFAULT FALSE
		);
		
		CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
		CREATE INDEX IF NOT EXISTS idx_users_roles ON users(
			role_diamond_club, role_diamond_teams, role_entropy_member,
			role_management, role_developer, role_head_management, role_projektleitung
		);
		`
	_, err = DB.Exec(usersTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der users-Tabelle: %v", err)
	}

	// join / invite Logs (referenziert users)
	logJoinsTable := `
		CREATE TABLE IF NOT EXISTS log_joins (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			inviter     INTEGER,
			invite_code TEXT,
			joiner      INTEGER,
			joined_at   DATETIME,
			FOREIGN KEY(inviter) REFERENCES users(id),
			FOREIGN KEY(joiner)  REFERENCES users(id)
		);
		`
	_, err = DB.Exec(logJoinsTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der log_joins-Tabelle: %v", err)
	}

	// leave Logs (referenziert users)
	logLeavesTable := `
		CREATE TABLE IF NOT EXISTS log_leaves (
			id        INTEGER PRIMARY KEY AUTOINCREMENT,
			leaver    INTEGER,
			left_at   DATETIME,
			FOREIGN KEY(leaver) REFERENCES users(id)
		);
		`
	_, err = DB.Exec(logLeavesTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der log_leaves-Tabelle: %v", err)
	}

	// voice Logs (referenziert users)
	logVoiceTable := `
		CREATE TABLE IF NOT EXISTS log_voice (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER,
			channel_id TEXT,
			joined_at  DATETIME,
			left_at    DATETIME,
			duration   INTEGER,    -- Sekunden im Voice-Channel
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		`
	_, err = DB.Exec(logVoiceTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der log_voice-Tabelle: %v", err)
	}

	// aggregierter Nachrichten-Zähler (referenziert users)
	messageCountsTable := `
		CREATE TABLE IF NOT EXISTS message_counts (
			user_id       INTEGER PRIMARY KEY,
			message_count INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		`
	_, err = DB.Exec(messageCountsTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der message_counts-Tabelle: %v", err)
	}

	// vereinfachte Log-Tabelle für Messages (referenziert users)
	logMessagesTable := `
		CREATE TABLE IF NOT EXISTS log_messages (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER,
			created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		`
	_, err = DB.Exec(logMessagesTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der log_messages-Tabelle: %v", err)
	}

	/*==============================================*/
	// QUIZ TABLE
	/*==============================================*/

	quizquestonTable := `
		CREATE TABLE IF NOT EXISTS quiz_questions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			scheduled_date DATE UNIQUE,
			question TEXT NOT NULL,
			answer1 TEXT NOT NULL,
			answer2 TEXT NOT NULL,
			answer3 TEXT NOT NULL,
			correct INTEGER NOT NULL,
			category TEXT,
			asked INTEGER DEFAULT 0
		);
		`
	_, err = DB.Exec(quizquestonTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der quizQuestion-Tabelle: %v", err)
	}

	quizResponsesTable := `
		CREATE TABLE IF NOT EXISTS quiz_responses (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id      INTEGER NOT NULL REFERENCES users(id),
			question_id  INTEGER NOT NULL,
			selected     INTEGER NOT NULL,
			correct      INTEGER NOT NULL,
			answered_at  DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		`

	_, err = DB.Exec(quizResponsesTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der quizResponse-Tabelle: %v", err)
	}

	/*==============================================*/
	// SURVEY TABLES
	/*==============================================*/

	surveyAnswersTable := `
		CREATE TABLE IF NOT EXISTS survey_answers (
			user_id   TEXT    PRIMARY KEY,
			username  TEXT,
			answer    TEXT,
			timestamp INTEGER
		);
		`
	_, err = DB.Exec(surveyAnswersTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der survey_answers-Tabelle: %v", err)
	}

	surveyTable := `
		CREATE TABLE IF NOT EXISTS surveys (
			id TEXT PRIMARY KEY,
			survey_type TEXT NOT NULL,
			role_id TEXT NOT NULL,
			total_answers INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		`

	_, err = DB.Exec(surveyTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der surveys-Tabelle: %v", err)
	}

	surveyUserAnswersTable := `
		CREATE TABLE IF NOT EXISTS survey_user_answers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			survey_id TEXT NOT NULL, 
			answer TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (survey_id) REFERENCES surveys(id),
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
		`

	_, err = DB.Exec(surveyUserAnswersTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der survey_user_answers-Tabelle: %v", err)
	}

	/*==============================================*/
	// CONSTANTS TABLE
	/*==============================================*/

	constantsTable := `
		CREATE TABLE IF NOT EXISTS bot_const_ids (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			const_key VARCHAR(100) NOT NULL,
			prod_value TEXT,
			test_value TEXT,
			description TEXT,
			category VARCHAR(50),
			is_active BOOLEAN DEFAULT true,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(const_key)
		);
	`
	_, err = DB.Exec(constantsTable)
	if err != nil {
		log.Fatalf("Fehler beim Erstellen der constants-Tabelle: %v", err)
	}

	/*==============================================*/
	// END OF TABLE CREATION
	/*==============================================*/

	log.Println("Tabellen erfolgreich erstellt oder bereits vorhanden.")
}
