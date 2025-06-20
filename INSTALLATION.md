# 🚀 Installationsanleitung

Diese Anleitung führt Sie Schritt für Schritt durch die Installation und Konfiguration der Discord-Bot-Webseite.

## 📋 Voraussetzungen

Stellen Sie sicher, dass folgende Software installiert ist:

- **Node.js** (v20 oder höher)
- **npm** (v8 oder höher)
- **Go** (v1.19 oder höher) - für den Discord Bot
- **Git**

## 📂 Projekt klonen

```bash
git clone <repository-url>
cd discord-bot-webapp
```

## 🤖 Discord Bot (falls noch nicht läuft)

Falls der Discord Bot noch nicht konfiguriert ist:

1. **Discord Bot erstellen:**
   - Gehen Sie zur [Discord Developer Portal](https://discord.com/developers/applications)
   - Erstellen Sie eine neue Application
   - Erstellen Sie einen Bot und kopieren Sie den Token

2. **Bot konfigurieren:**
   ```bash
   cd bot/
   cp .env.example .env
   ```

3. **Environment Variables setzen:**
   ```bash
   # .env Datei bearbeiten
   DISCORD_BOT_TOKEN=your_bot_token_here
   GUILD_ID=your_discord_server_id
   GUILD_NAME="Your Discord Server Name"
   ```

4. **Bot starten:**
   ```bash
   go mod tidy
   go run main.go
   ```

## 🖥️ Backend Setup (NestJS)

1. **In das Backend-Verzeichnis wechseln:**
   ```bash
   cd webapp/backend/
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Environment Variables konfigurieren:**
   ```bash
   cp .env.example .env
   ```

4. **`.env` Datei bearbeiten:**
   ```bash
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # Database Configuration (Pfad zur SQLite-Datei des Discord Bots)
   DATABASE_PATH=../bot/database.db

   # Discord Bot Configuration
   GUILD_ID=your-discord-guild-id
   GUILD_NAME="Your Discord Server Name"

   # File Paths
   TICKET_TRANSCRIPTS_PATH=../bot/transcripts

   # CORS Configuration
   FRONTEND_URL=http://localhost:4200
   ```

5. **Upload-Verzeichnisse erstellen:**
   ```bash
   mkdir -p uploads/avatars
   ```

6. **Datenbank mit Beispieldaten initialisieren:**
   ```bash
   npm run seed
   ```

   Dies erstellt:
   - 3 Standard-Rollen (admin, moderator, member)
   - Standard-Berechtigungen
   - Admin-User (`admin@localhost` / `admin123`)
   - Moderator-User (`moderator@localhost` / `mod123`)

7. **Backend starten:**
   ```bash
   npm run start:dev
   ```

   Das Backend ist nun verfügbar unter: `http://localhost:3000`

## 🌐 Frontend Setup (Angular)

1. **In das Frontend-Verzeichnis wechseln:**
   ```bash
   cd webapp/frontend/
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Frontend mit Proxy starten:**
   ```bash
   npm run serve:proxy
   ```

   Das Frontend ist nun verfügbar unter: `http://localhost:4200`

## 🔐 Erste Anmeldung

1. **Browser öffnen:** Navigieren Sie zu `http://localhost:4200`

2. **Als Administrator anmelden:**
   - E-Mail: `admin@localhost`
   - Passwort: `admin123`

3. **Passwort ändern:** 
   - Gehen Sie zu "Mein Profil" > "Einstellungen"
   - Ändern Sie das Standard-Passwort

4. **Weitere Benutzer erstellen:**
   - Gehen Sie zu "Admin" > "Benutzer"
   - Erstellen Sie neue Benutzer nach Bedarf

## ⚙️ Konfiguration

### Berechtigungen zuweisen

1. Im Admin-Dashboard → "Benutzer"
2. Benutzer auswählen
3. "Berechtigungen verwalten"
4. Gewünschte Berechtigungen hinzufügen

### Tools konfigurieren

Die Tools sind automatisch verfügbar, wenn:
- Die entsprechenden Berechtigungen zugewiesen sind
- Die Datenpfade korrekt konfiguriert sind

**Discord Users Tool:**
- Berechtigung: `tools.discord_users`
- Benötigt: Zugriff auf `database.db`

**Ticket Transcripts Tool:**
- Berechtigung: `tools.ticket_transcripts`
- Benötigt: Zugriff auf Transcripts-Ordner

## 🧪 Test der Installation

1. **Backend-Health-Check:**
   ```bash
   curl http://localhost:3000/api/auth/profile
   # Should return 401 (unauthorized) - das ist korrekt ohne Token
   ```

2. **Frontend-Test:**
   - Öffnen Sie `http://localhost:4200`
   - Login-Seite sollte sichtbar sein
   - Anmeldung mit Test-Accounts sollte funktionieren

3. **Tools-Test:**
   - Nach Anmeldung → "Discord Users" sollte Discord-Mitglieder zeigen
   - "Ticket Transcripts" sollte Transkripte auflisten (falls vorhanden)

## 🔧 Troubleshooting

### Backend startet nicht

**Problem:** `Error: ENOENT: no such file or directory, open '../bot/database.db'`

**Lösung:**
```bash
# Prüfen Sie den Pfad zur Datenbank
ls -la ../bot/database.db

# Pfad in .env anpassen falls nötig
DATABASE_PATH=korreker/pfad/zur/database.db
```

### Frontend kann Backend nicht erreichen

**Problem:** Network errors in browser console

**Lösung:**
1. Prüfen Sie, ob Backend läuft: `curl http://localhost:3000`
2. Proxy-Konfiguration prüfen: `proxy.conf.json`
3. CORS-Einstellungen im Backend prüfen

### Keine Discord-Daten sichtbar

**Problem:** Discord Users Tool zeigt keine Daten

**Lösung:**
1. Discord Bot muss laufen und Daten in die Datenbank schreiben
2. Datenbankpfad im Backend überprüfen
3. SQL-Tabellen prüfen:
   ```sql
   sqlite3 database.db
   .tables
   SELECT COUNT(*) FROM discord_users;
   ```

### Ticket Transcripts nicht gefunden

**Problem:** "No transcripts found"

**Lösung:**
1. Transcripts-Pfad prüfen: `TICKET_TRANSCRIPTS_PATH` in `.env`
2. Berechtigung prüfen: User benötigt `tools.ticket_transcripts`
3. JSON-Dateien im Transcripts-Ordner prüfen

## 📝 Production Deployment

Für Production-Umgebung:

1. **Environment anpassen:**
   ```bash
   NODE_ENV=production
   JWT_SECRET=secure-random-key-minimum-32-characters
   ```

2. **Build erstellen:**
   ```bash
   # Backend
   cd webapp/backend/
   npm run build

   # Frontend
   cd webapp/frontend/
   npm run build
   ```

3. **Production starten:**
   ```bash
   # Backend
   npm run start:prod

   # Frontend mit Web-Server (z.B. nginx) serving dist/
   ```

4. **Reverse Proxy konfigurieren** (nginx/Apache)

## 🔄 Updates

Für zukünftige Updates:

1. **Git pull:**
   ```bash
   git pull origin main
   ```

2. **Dependencies aktualisieren:**
   ```bash
   # Backend
   cd webapp/backend/
   npm install

   # Frontend
   cd webapp/frontend/
   npm install
   ```

3. **Datenbank-Migrationen** (falls vorhanden):
   ```bash
   npm run migration:run
   ```

4. **Services neu starten**

---

🎉 **Glückwunsch!** Ihre Discord-Bot-Webseite ist jetzt einsatzbereit!

Bei weiteren Fragen konsultieren Sie das [README.md](./README.md) oder erstellen Sie ein Issue im Repository.