# Entropy Gaming - Bot & Web-App Dokumentation

## Projektstruktur

```
/bot        - Discord Bot geschrieben in GO
/db         - SQLite Datenbank 
/webapp     - Python Flask Web-Anwendung
```

## Generelle Entwicklungsrichtlinien

Alle Veränderungen werden auf einen Branch != origin/main gepusht. Merge Requests werden von Jamie gemacht und durchgeführt, da er den Code vorher überprüft. KI darf ausdrücklich verwendet werden, jedoch überprüft bitte ob es sinn macht was die KI da macht.

**Code-Standards:**
- Variabeln sollen aussagekräftig sein (!= var1, var2)
- Variabeln beim Aufruf von Funktionen sollten bitte wenn möglich gleich bleiben
- Konsistente Namenskonventionen verwenden

---

## Discord Bot (Go)

### Core-System

Der Discord Bot ist in Go geschrieben und verwendet die `discordgo` Library. Er unterstützt sowohl Development- als auch Production-Modi mit separaten Bot-Tokens.

**Startup-Prozess:**
- Token-Validierung (Dev/Prod)
- Tracking-Handler Initialisierung
- Event-Handler Registration
- Command Registration
- API-Server Start (optional)

### Utils

**Error & Logging Service**
- **Pfad:** `bot/utils/error_admin_dm.go`
- **Import:** `"bot/utils"`
- **Verwendung:** `utils.LogAndNotifyAdmins`
- **Funktionen:**
  - Logging in verschiedenen Schweregraden (info, warn, high, critical)
  - Automatische Admin-Benachrichtigungen bei kritischen Fehlern
  - Datei- und Zeilen-Tracking für Debugging

### Bot-Funktionen

#### 1. Ticket-System
**Handler:** `bot/handlers/tickets/`

**Features:**
- **Ticket-Erstellung:** Dropdown-Menü für verschiedene Bereiche
  - Beitritt Diamond Club
  - Bewerbung Competitive Teams
  - Support-Anfragen
- **Automatische Kanal-Erstellung:** Privater Channel pro Ticket
- **Berechtigung-Management:** Automatische Rollen-Zuweisung
- **User-Left Detection:** Alle 5 Minuten Überprüfung (Cron)
- **Transcript-Generierung:** Vollständige Chat-Logs für Web-App

**Commands:**
- `/ticket` - Ticket-System anzeigen

#### 2. Quiz-System  
**Handler:** `bot/handlers/quiz/`

**Features:**
- **Tägliche Quiz-Fragen:** Automatisch um 18 Uhr (Cron)
- **Interaktive Auswahl:** SelectMenu mit 3 Antwortmöglichkeiten
- **Quiz-Rolle:** Button zum Abonnieren der Quiz-Benachrichtigungen
- **Datenbank-Integration:** Fragen in SQLite gespeichert

**Commands:**
- `/quiz` - Quiz-Rolle Button anzeigen

**Cron:** Täglich 18:00 Uhr

#### 3. Tracking-System
**Handler:** `bot/handlers/tracking/`

**Voice-Tracking:**
- Automatische Erfassung von Voice-Channel-Zeiten
- Session-Management für Channel-Wechsel
- Vollständige Statistiken in Datenbank

**Message-Tracking:**
- Nachrichten-Counter pro User
- Channel-spezifische Statistiken

**Invite-Tracking:**
- Überwachung von Server-Einladungen
- Attribution von neuen Mitgliedern

**Leave-Tracking:**
- Verfolgung von Mitglieder-Austritten
- Automatische Datenbereinigung

#### 4. Weekly Updates
**Handler:** `bot/handlers/weekly_updates/`

**Features:**
- **Automatische Berichte:** Jeden Sonntag 20:00 Uhr
- **Datensammlung:** Voice-Zeit, Messages, neue Member
- **Embed-Generierung:** Formatierte wöchentliche Statistiken
- **Kanal-Broadcasting:** Verteilung an definierte Channels

**Cron:** Sonntag 20:00 Uhr

#### 5. Staff Advertising
**Handler:** `bot/handlers/advertising/staff/`

**Features:**
- **Wöchentliche Stellenausschreibungen:** Jeden Sonntag 14:00 Uhr
- **JSON-basierte Konfiguration:** Flexible Job-Definitionen
- **Multi-Channel-Broadcast:** Verteilung an mehrere Kanäle
- **Embed-Formatting:** Professionelle Job-Anzeigen

**Cron:** Sonntag 14:00 Uhr

#### 6. Discord Administration

**Channel-Management:**
- **Text-Channels:** Automatischer Purger (täglich 4:00 Uhr)
- **Voice-Channels:** 
  - Automatic Voice Channel Creation
  - Voice Visibility Tracking
  - Dynamic Channel Management

**Team Areas:**
- **Wöchentliche Synchronisation:** Team-Member Rollen-Updates
- **Role-Change Handler:** Automatische Team-Zuordnung

**Cron Jobs:**
- TimedPurger: Täglich 4:00 Uhr
- Team Sync: Wöchentlich

#### 7. API-Schnittstelle
**Handler:** `bot/api/`

**Features:**
- **REST-API:** HTTP-Endpoints für Web-App-Integration
- **Bot-Status:** Live-Status und Statistiken
- **Command-Execution:** Fernsteuerung bestimmter Bot-Funktionen
- **Daten-Export:** JSON-basierte Datenabfrage

**Konfiguration:** `ENABLE_API=true`

---

## Web-Anwendung (Python Flask)

### Architektur

**Framework:** Flask mit Blueprint-Pattern
**Authentifizierung:** Discord OAuth 2.0
**Datenbank:** SQLite mit direkter Integration zur Bot-DB
**Frontend:** Bootstrap 5 mit Custom Entropy Gaming Theme

### Core-Features

#### 1. Dashboard
**Blueprint:** `webapp/internal/blueprints/dashboard/`

**Features:**
- **Statistik-Übersicht:**
  - Aktive Discord-User
  - Gesamt-Tickets und offene Tickets
  - Web-User und Admin-Aktivitäten
- **Schnellzugriff:**
  - Teams anzeigen
  - Ticket-Suche
  - Organigramm
  - Profil-Verwaltung
- **Recent Activity:** Live-Updates von Benutzeraktivitäten
- **Auto-Refresh:** Dynamische Statistik-Updates

#### 2. Admin-Panel
**Blueprint:** `webapp/internal/blueprints/admin/`

**Benutzer-Verwaltung:**
- **User-Liste:** Paginiert mit Such- und Filterfunktionen
- **Rollen-Management:** Dynamische Rollenzuweisung
- **User-Bearbeitung:** Vollständige Profilediting
- **Aktivitäts-Logs:** Komplette Audit-Trails
- **System-Informationen:** Platform und Version-Details

**Zugriffskontrolle:** 
- Nur für Rollen: `Projektleitung`, `Developer`
- Vollständige RBAC-Implementation

#### 3. Ticket-Management
**Blueprint:** `webapp/internal/blueprints/tickets/`

**Features:**
- **Ticket-Übersicht:**
  - Paginierte Liste aller Tickets
  - Such- und Filterfunktionen (Status, Bereich)
  - Sortierung nach verschiedenen Kriterien
- **Ticket-Details:**
  - Vollständige Ticket-Informationen
  - **Transcript-Viewer:** Integration der Bot-generierten Chat-Logs
  - Meta-Daten (Ersteller, Bearbeiter, Zeiten)
  - Status-Tracking
- **API-Endpunkte:** JSON-basierte Suchfunktionen

**Ticket-Bereiche:**
- Diamond Club Beitritt
- Competitive Team Bewerbungen
- Support-Anfragen
- Sonstige Anliegen

#### 4. Team-Management
**Blueprint:** `webapp/internal/blueprints/teams/`

**Features:**
- **Team-Übersicht:** Hierarchische Darstellung aller Teams
- **Member-Details:** Individuelle Statistiken und Rollen
- **Team-Statistiken:** Voice-Zeit, Messages, Aktivität
- **Rolle-Integration:** Automatische Discord-Rollen-Synchronisation

#### 5. Forum-System
**Blueprint:** `webapp/internal/blueprints/forum/`

**Advanced Features:**
- **Markdown-Support:** Vollständige Markdown-Syntax mit Syntax-Highlighting
- **Datei-Uploads:** Multiple Dateiformate (PDF, Bilder, Dokumente)
- **AI-Integration:** 
  - **Grok AI API:** Automatische Post-Zusammenfassungen
  - **Smart Summaries:** KI-generierte Kurzzusammenfassungen
- **Kategorien-System:** Strukturierte Forum-Organisation
- **Kommentar-System:** Verschachtelte Diskussionen
- **Content-Moderation:** Spam-Filter und Profanity-Check

**File-Support:** 
- Bilder: PNG, JPG, JPEG, GIF
- Dokumente: PDF, DOC, DOCX, XLSX, PPTX
- Archive: ZIP, RAR
- Text: TXT
- Maximale Dateigröße: 512MB

#### 6. Organigramm
**Feature:** `webapp/internal/blueprints/dashboard/orgchart`

**Funktionen:**
- **JSON-basierte Struktur:** Flexible Hierarchie-Definition
- **Interaktive Visualisierung:** D3.js-basierte Darstellung
- **Rollen-Details:** Spezifische Aufgabenbereiche
- **Dynamische Updates:** Einfache Struktur-Anpassungen

**Aktuelle Struktur:**
```
CEO (Michael Decker)
├── Projektleitung (Jamie Rohner) - CIO/CTO & Team Akquise
├── Projektleitung (Fabian "Evolution") - CGO  
├── Projektleitung (Philipp) - Allgemeine Projektkoordination
├── Projektleitung (Roskato) - Content & Social Media
└── Club Management (TBD)
    ├── Club Leitung (Eric, Mini, Mella)
    ├── Mediengestalter (Marvin)
    └── Social Media Manager (Paul, Marcel)
```

#### 7. Profil-Management
**Blueprint:** `webapp/internal/blueprints/profile/`

**Features:**
- **Discord-Integration:** Automatische Avatar und Username-Synchronisation
- **Rollen-Anzeige:** Live Discord-Rollen-Status
- **Aktivitäts-Historie:** Persönliche Activity-Logs
- **Statistiken:** Voice-Zeit, Messages, Forum-Beiträge
- **Kontakt-Informationen:** Sichere Anzeige von User-Daten

#### 8. Authentication System
**Blueprint:** `webapp/internal/blueprints/auth/`

**Discord OAuth 2.0:**
- **Single Sign-On:** Nahtlose Discord-Integration
- **Role-based Access Control:** Automatische Rollenerkennung
- **Session-Management:** Sichere 24h-Sessions
- **Permission-System:** Granulare Zugriffskontrolle

**Sicherheits-Features:**
- CSRF-Protection mit WTF-Forms
- Secure Cookie-Handling
- Rate Limiting für API-Endpunkte
- Input-Sanitization

### Datenbank-Integration

**SQLite-Database:** Shared zwischen Bot und Web-App
- **User-Tabellen:** Discord-User-Synchronisation
- **Ticket-System:** Vollständige Ticket-Daten
- **Activity-Logs:** Umfassende Audit-Trails
- **Forum-Data:** Posts, Kommentare, Uploads
- **Statistics:** Voice-Zeit, Messages, Tracking-Daten

### Technische Konfiguration

**Environment-Variablen:**
```bash
# Discord Integration
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...

# AI Features
GROK_API_KEY=...
GROK_API_URL=https://api.x.ai/v1/chat/completions

# Security
SECRET_KEY=...
WTF_CSRF_ENABLED=True

# Bot Integration
BOT_API_URL=http://localhost:8080
BOT_API_ENABLED=True
```

**Feature Flags:**
- `AI_SUMMARY_ENABLED`: KI-Zusammenfassungen
- `FORUM_MARKDOWN_ENABLED`: Markdown-Support
- `FORUM_ATTACHMENTS_ENABLED`: Datei-Uploads
- `FORUM_COMMENTS_ENABLED`: Kommentar-System

---

## Cron-Jobs Übersicht

| Handler | Zeitplan | Funktion |
|---------|----------|----------|
| UserLeft Tickets | Alle 5 Minuten | Überprüfung verlassener Tickets |
| TimedPurger | Täglich 4:00 Uhr | Channel-Bereinigung |
| Quiz Questions | Täglich 18:00 Uhr | Tägliche Quiz-Fragen |
| Weekly Updates | Sonntag 20:00 Uhr | Wöchentliche Statistik-Berichte |
| Staff Advertising | Sonntag 14:00 Uhr | Stellenausschreibungen |

**Konfiguration:** Alle Cron-Spezifikationen werden in der Datenbank gespeichert und sind über `utils.GetIdFromDB()` abrufbar.

---

## API-Integration

**Bot ↔ Web-App Communication:**
- RESTful API-Endpunkte für Daten-Synchronisation
- Real-time Status-Updates
- Command-Execution-Interface
- Shared SQLite-Database für konsistente Daten

**External APIs:**
- **Discord API:** OAuth, Guild-Management, Bot-Interaktionen
- **Grok AI API:** Forum-Post-Zusammenfassungen
- **File Processing:** Image-Handling, Document-Parsing

---

## Deployment & Development

**Development-Setup:**
1. Environment-Variablen konfigurieren
2. SQLite-Database initialisieren
3. Bot starten: `go run main.go`
4. Web-App starten: `python app.py`

**Production-Considerations:**
- Separate Dev/Prod Bot-Tokens
- Secure Environment-Variable-Management
- Database-Backups und Migration-Strategien
- Load-Balancing für Web-App
- API-Rate-Limiting

**Testing:**
- Dev-Test-Functions für Manual-Testing
- Automated Cron-Job-Testing
- Discord-Interaction-Simulation

---

## Roadmap & TODOs

**Bekannte TODOs:**
- Cron-Integration in Datenbank vervollständigen
- Bilder in Ticket-Transcripts implementieren
- Permission-Change-Handler für Tickets erweitern
- Advanced Analytics-Dashboard
- Mobile-Responsive Design-Verbesserungen