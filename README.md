# Discord Bot mit integrierter Webseite

Dieses Projekt besteht aus einem Discord-Bot in Go und einer internen Webseite mit Angular Frontend und NestJS Backend.

## 📁 Projektstruktur

```
bot/                           # Discord Bot (Go)
├── discord/                   # Bot-Logik
├── database/                  # Datenbankverbindung
├── handlers/                  # Command & Event Handler
├── database.db               # SQLite Datenbank
└── transcripts/              # Ticket-Transkripte

webapp/                       # Webseite
├── backend/                  # NestJS API Server
│   ├── src/
│   │   ├── auth/            # Authentifizierung
│   │   ├── users/           # Benutzerverwaltung
│   │   ├── roles/           # Rollensystem
│   │   ├── permissions/     # Berechtigungssystem
│   │   ├── profile/         # Benutzerprofil
│   │   ├── tools/           # Discord Tools
│   │   ├── comments/        # Kommentarsystem
│   │   └── admin/           # Admin-Dashboard
│   └── uploads/             # Datei-Uploads
└── frontend/                # Angular App
    ├── src/app/
    │   ├── core/            # Services & Guards
    │   ├── shared/          # Wiederverwendbare Komponenten
    │   ├── features/        # Feature-Module
    │   │   ├── auth/        # Login
    │   │   ├── dashboard/   # Hauptdashboard
    │   │   ├── profile/     # Benutzerprofile
    │   │   ├── admin/       # Admin-Bereich
    │   │   ├── tools/       # Discord Tools
    │   │   └── users/       # Benutzerverwaltung
    └── proxy.conf.json     # Proxy-Konfiguration
```

## 🚀 Installation & Setup

### 1. Discord Bot (Go)

Der Bot ist bereits funktionsfähig. Stellen Sie sicher, dass die `.env`-Datei korrekt konfiguriert ist:

```bash
cd bot/
cp .env.example .env
# Bearbeiten Sie .env mit Ihren Discord-Bot-Daten
go mod tidy
go run main.go
```

### 2. Backend (NestJS)

```bash
cd webapp/backend/

# Dependencies installieren
npm install

# Environment Variables konfigurieren
cp .env.example .env
# Bearbeiten Sie .env (siehe Konfiguration unten)

# Uploads-Ordner erstellen
mkdir -p uploads/avatars

# Datenbank mit Beispieldaten initialisieren
npm run seed

# Development Server starten
npm run start:dev
```

Das Backend läuft auf `http://localhost:3000`

### 3. Frontend (Angular)

```bash
cd webapp/frontend/

# Dependencies installieren
npm install

# Development Server mit Proxy starten
npm run serve:proxy
```

Das Frontend läuft auf `http://localhost:4200`

## ⚙️ Konfiguration

### Backend (.env)

```bash
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Datenbank (Pfad zur SQLite-Datei des Discord Bots)
DATABASE_PATH=../bot/database.db

# Discord Bot Daten (optional)
GUILD_ID=your-discord-guild-id
GUILD_NAME=Your Discord Server Name

# Dateipfade
TICKET_TRANSCRIPTS_PATH=../bot/transcripts

# Frontend
FRONTEND_URL=http://localhost:4200
```

### Erste Anmeldung

Nach dem Seeding können Sie sich mit folgenden Test-Accounts anmelden:

**Administrator:**
- E-Mail: `admin@localhost`
- Passwort: `admin123`

**Moderator:**
- E-Mail: `moderator@localhost`
- Passwort: `mod123`

⚠️ **Wichtig:** Ändern Sie diese Passwörter nach der ersten Anmeldung!

## 🎯 Features

### Authentifizierung & Benutzer
- ✅ JWT-basierte Authentifizierung
- ✅ Rollen- und Berechtigungssystem (unabhängig voneinander)
- ✅ Admin-Dashboard für Benutzerverwaltung
- ✅ Benutzer können sich nicht selbst registrieren
- ✅ Account aktivieren/deaktivieren

### Benutzerprofile
- ✅ Personalisierbare Profile mit Avatar-Upload
- ✅ Öffentliche/Private Profile
- ✅ Soziale Links und benutzerdefinierte Felder
- ✅ Passwort und E-Mail ändern

### Tools
- ✅ **Discord Users Tool**: Anzeige aller Discord-Benutzer mit Kommentarfunktion
- ✅ **Ticket Transcripts Tool**: Durchsuchen von Ticket-Transkripten
- ✅ Berechtigung-basierter Zugriff auf Tools

### Kommentarsystem
- ✅ Modulares Kommentarsystem für alle Bereiche
- ✅ Private und öffentliche Kommentare
- ✅ Bearbeiten und Löschen von eigenen Kommentaren
- ✅ Moderationstools für Admins

### Dashboard
- ✅ Übersicht über Discord-Server-Statistiken
- ✅ Verfügbare Tools basierend auf Berechtigungen
- ✅ Aktivitätsübersicht

## 🔐 Berechtigungssystem

### Standard-Rollen
- **Admin**: Vollzugriff auf alle Funktionen
- **Moderator**: Begrenzte Admin-Rechte, Tools-Zugriff
- **Member**: Basis-Berechtigung

### Standard-Berechtigungen
- `users.view` - Benutzer anzeigen
- `users.edit` - Benutzer bearbeiten
- `users.manage` - Benutzer-Status verwalten
- `permissions.assign` - Berechtigungen zuweisen
- `tools.discord_users` - Discord-User-Tool
- `tools.ticket_transcripts` - Ticket-Transkripte
- `comments.create` - Kommentare erstellen
- `comments.edit` - Eigene Kommentare bearbeiten
- `comments.delete` - Eigene Kommentare löschen
- `comments.moderate` - Alle Kommentare moderieren

## 🔗 Integration

### Datenbank
Die Webseite nutzt die bestehende SQLite-Datenbank des Discord-Bots:
- Liest Discord-Benutzerdaten
- Erweitert die Datenbank um Webapp-spezifische Tabellen
- Keine Konflikte mit Bot-Operationen

### Ticket-Transkripte
- Liest JSON-Transkripte aus dem Bot-Verzeichnis
- Durchsuchbar und kommentierbar
- Keine Veränderung der originalen Dateien

## 🛠️ Development

### Backend Development
```bash
cd webapp/backend/
npm run start:dev    # Watch-Mode
npm run build        # Production Build
npm run test         # Tests
```

### Frontend Development
```bash
cd webapp/frontend/
npm run start        # Development Server
npm run build        # Production Build
npm run test         # Tests
```

### API-Dokumentation
Das Backend stellt folgende API-Endpunkte bereit:
- `GET /api/auth/*` - Authentifizierung
- `GET /api/users/*` - Benutzerverwaltung
- `GET /api/admin/*` - Admin-Funktionen
- `GET /api/tools/*` - Discord-Tools
- `GET /api/profiles/*` - Benutzerprofile
- `GET /api/comments/*` - Kommentarsystem

## 📝 Zukünftige Erweiterungen

- [ ] Push-Benachrichtigungen
- [ ] Erweiterte Aktivitätslogs
- [ ] Dashboard-Widgets konfigurierbar
- [ ] Mehr Discord-Integration (Rollen-Sync)
- [ ] Backup & Export-Funktionen

## 🤝 Beitrag

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Erstelle einen Pull Request

## 📄 Lizenz

Dieses Projekt ist für interne Nutzung gedacht.

## 🆘 Support

Bei Fragen oder Problemen:
1. Überprüfe die Logs (Backend: `npm run start:dev`, Frontend: Browser-Konsole)
2. Stelle sicher, dass alle Environment Variables korrekt gesetzt sind
3. Prüfe die Datenbankverbindung (Pfad zur SQLite-Datei)
4. Erstelle ein Issue im Repository

---

**Hinweis:** Dies ist eine interne Webseite für Organisationsmitglieder. Der Zugang ist auf autorisierte Benutzer beschränkt.