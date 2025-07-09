package utils

import (
	"database/sql"
)

// EnsureUser prüft, ob ein Benutzer mit der gegebenen Discord-ID existiert.
// Falls nicht, wird ein neuer Datensatz angelegt. Bei Konflikt wird Username
// sowie last_seen aktualisiert.
// Die interne users.id wird zurückgegeben.
func EnsureUser(db *sql.DB, discordID, username string) (int, error) {
	var id int
	err := db.QueryRow(`
        INSERT INTO users (discord_id, username)
        VALUES (?, ?)
        ON CONFLICT(discord_id) DO UPDATE
          SET username  = excluded.username,
              last_seen = CURRENT_TIMESTAMP
        RETURNING id;`, discordID, username).Scan(&id)
    if err != nil {
        return 0, err
    }
    return id, nil
}