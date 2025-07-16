import sqlite3
import sys
from datetime import datetime

def migrate_database(db_path):
    """
    Migriert die users-Tabelle vom aktuellen Schema zum gewünschten Schema.
    """
    try:
        # Verbindung zur Datenbank herstellen
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Foreign keys aktivieren
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        print("Starte Datenbankschema-Migration...")
        
        # Backup der aktuellen Tabelle erstellen (optional)
        print("Erstelle Backup der aktuellen Tabelle...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_backup AS 
            SELECT * FROM users;
        """)
        
        # Neue Spalten hinzufügen
        new_columns = [
            ("display_name", "TEXT"),
            ("nickname", "TEXT"),
            ("avatar_url", "TEXT"),
            ("is_bot", "BOOLEAN DEFAULT FALSE"),
            ("joined_server_at", "DATETIME"),
            ("role_diamond_club", "BOOLEAN DEFAULT FALSE"),
            ("role_diamond_teams", "BOOLEAN DEFAULT FALSE"),
            ("role_entropy_member", "BOOLEAN DEFAULT FALSE"),
            ("role_management", "BOOLEAN DEFAULT FALSE"),
            ("role_developer", "BOOLEAN DEFAULT FALSE"),
            ("role_head_management", "BOOLEAN DEFAULT FALSE"),
            ("role_projektleitung", "BOOLEAN DEFAULT FALSE")
        ]
        
        for column_name, column_type in new_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type};")
                print(f"✓ Spalte '{column_name}' hinzugefügt")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"⚠ Spalte '{column_name}' existiert bereits")
                else:
                    print(f"✗ Fehler beim Hinzufügen der Spalte '{column_name}': {e}")
        
        # last_seen Spalte updaten, um DEFAULT-Wert zu haben
        # Da SQLite keine direkte Änderung von DEFAULT-Werten unterstützt,
        # setzen wir alle NULL-Werte auf CURRENT_TIMESTAMP
        cursor.execute("""
            UPDATE users 
            SET last_seen = CURRENT_TIMESTAMP 
            WHERE last_seen IS NULL;
        """)
        print("✓ last_seen Spalte aktualisiert")
        
        # Indizes erstellen
        print("Erstelle Indizes...")
        
        # Index für discord_id (falls nicht existiert)
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);")
            print("✓ Index für discord_id erstellt")
        except sqlite3.OperationalError as e:
            print(f"⚠ Index für discord_id: {e}")
        
        # Index für Rollen
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_roles ON users(
                    role_diamond_club, role_diamond_teams, role_entropy_member,
                    role_management, role_developer, role_head_management, role_projektleitung
                );
            """)
            print("✓ Index für Rollen erstellt")
        except sqlite3.OperationalError as e:
            print(f"⚠ Index für Rollen: {e}")
        
        # Migration abschließen
        conn.commit()
        print("\n✅ Migration erfolgreich abgeschlossen!")
        
        # Neue Tabellenstruktur anzeigen
        print("\nNeue Tabellenstruktur:")
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
        
        # Indizes anzeigen
        print("\nErstellte Indizes:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users';")
        indexes = cursor.fetchall()
        for index in indexes:
            print(f"  {index[0]}")
        
    except sqlite3.Error as e:
        print(f"✗ Datenbankfehler: {e}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"✗ Allgemeiner Fehler: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
    
    return True

def verify_migration(db_path):
    """
    Verifiziert die Migration durch Überprüfung der Tabellenstruktur.
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Spalten überprüfen
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        expected_columns = [
            'id', 'discord_id', 'username', 'display_name', 'nickname', 
            'avatar_url', 'is_bot', 'joined_server_at', 'first_seen', 
            'last_seen', 'role_diamond_club', 'role_diamond_teams', 
            'role_entropy_member', 'role_management', 'role_developer', 
            'role_head_management', 'role_projektleitung'
        ]
        
        missing_columns = [col for col in expected_columns if col not in column_names]
        
        if missing_columns:
            print(f"⚠ Fehlende Spalten: {missing_columns}")
            return False
        else:
            print("✅ Alle erwarteten Spalten vorhanden")
            return True
        
    except sqlite3.Error as e:
        print(f"✗ Fehler bei der Verifikation: {e}")
        return False
    finally:
        conn.close()

def main():
    # Datenbankpfad - anpassen nach Bedarf
    db_path = "db/data/entropy.db"
    
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    print(f"Verwende Datenbank: {db_path}")
    print("=" * 50)
    
    # Migration durchführen
    if migrate_database(db_path):
        print("\n" + "=" * 50)
        print("Verifikation der Migration...")
        verify_migration(db_path)
    else:
        print("\n✗ Migration fehlgeschlagen!")
        sys.exit(1)

if __name__ == "__main__":
    main()