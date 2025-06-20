# Discord Bot Webapp Backend

Dies ist das NestJS Backend für die interne Webseite der Discord-Bot-Organisation.

## Features

- **Authentifizierung**: JWT-basierte Authentifizierung mit Rollen und Berechtigungen
- **User Management**: Vollständige Benutzerverwaltung mit Admin-Dashboard
- **Rollen & Berechtigungen**: Flexibles System mit unabhängigen Rollen und Berechtigungen
- **Profile System**: Personalisierbare Benutzerprofile mit Avatar-Upload
- **Tools Integration**: 
  - Discord Users Tool mit Kommentaren
  - Ticket Transcripts Browser
- **Comments System**: Modulares Kommentarsystem für alle Bereiche
- **Discord Integration**: Anbindung an die bestehende SQLite-Datenbank des Bots

## Installation

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   ```bash
   cp .env.example .env
   # Bearbeite .env mit deinen Werten
   ```

3. **Uploads-Ordner erstellen:**
   ```bash
   mkdir -p uploads/avatars
   ```

4. **Development Server starten:**
   ```bash
   npm run start:dev
   ```

## Konfiguration

### Wichtige Environment Variables

- `DATABASE_PATH`: Pfad zur SQLite-Datenbank des Discord-Bots
- `TICKET_TRANSCRIPTS_PATH`: Pfad zu den Ticket-Transkripten
- `JWT_SECRET`: Geheimer Schlüssel für JWT-Tokens
- `PORT`: Server-Port (Standard: 3000)

### Erste Schritte

1. **Admin-User erstellen:**
   Nach dem ersten Start können Sie über das Admin-Dashboard (/admin) einen ersten Admin-User erstellen.

2. **Rollen einrichten:**
   Standardrollen können über die API oder das Admin-Interface erstellt werden.

3. **Berechtigungen zuweisen:**
   Das System erstellt automatisch Standard-Berechtigungen. Diese können über das Admin-Dashboard verwaltet werden.

## API Endpoints

### Authentifizierung
- `POST /auth/login` - User-Login
- `POST /auth/logout` - User-Logout
- `GET /auth/profile` - Aktueller User
- `POST /auth/change-password` - Passwort ändern

### User Management
- `GET /users` - Alle User (Berechtigung erforderlich)
- `GET /users/me` - Eigenes Profil
- `PATCH /users/me` - Eigenes Profil bearbeiten
- `POST /users/:id/toggle-status` - User aktivieren/deaktivieren

### Admin
- `POST /admin/users` - User erstellen
- `GET /admin/stats` - System-Statistiken
- `GET /admin/roles` - Alle Rollen
- `GET /admin/permissions` - Alle Berechtigungen

### Tools
- `GET /tools` - Verfügbare Tools
- `GET /tools/discord-users` - Discord-User-Tool
- `GET /tools/ticket-transcripts` - Ticket-Transkripte

### Profile
- `GET /profiles/me` - Eigenes Profil
- `PATCH /profiles/me` - Profil bearbeiten
- `POST /profiles/me/avatar` - Avatar hochladen

### Comments
- `POST /comments` - Kommentar erstellen
- `GET /comments/entity/:type/:id` - Kommentare für Entity

## Berechtigungen

### Standard-Berechtigungen:
- `users.view` - User anzeigen
- `users.edit` - User bearbeiten
- `users.manage` - User-Status verwalten
- `permissions.assign` - Berechtigungen zuweisen
- `tools.discord_users` - Discord-User-Tool
- `tools.ticket_transcripts` - Ticket-Transkripte
- `comments.create` - Kommentare erstellen
- `comments.edit` - Eigene Kommentare bearbeiten
- `comments.delete` - Eigene Kommentare löschen
- `comments.moderate` - Alle Kommentare moderieren

## Datenbankstruktur

Das Backend nutzt TypeORM mit folgenden Entitäten:
- `User` - Webapp-Benutzer
- `Role` - Benutzerrollen
- `Permission` - System-Berechtigungen
- `UserPermission` - User-Berechtigungen-Zuordnung
- `Profile` - Benutzerprofile
- `Comment` - Kommentarsystem

## Development

```bash
# Development mit Watch-Mode
npm run start:dev

# Build für Production
npm run build

# Tests ausführen
npm test

# Linting
npm run lint
```

## Deployment

1. Environment für Production konfigurieren
2. `npm run build`
3. `npm run start:prod`

## Troubleshooting

### Häufige Probleme:

1. **Datenbankverbindung fehlgeschlagen:**
   - Prüfe `DATABASE_PATH` in .env
   - Stelle sicher, dass die SQLite-Datei existiert

2. **Upload-Fehler:**
   - Prüfe, ob der uploads-Ordner existiert und beschreibbar ist

3. **JWT-Fehler:**
   - Prüfe `JWT_SECRET` in .env
   - Token könnten abgelaufen sein

4. **Berechtigungsfehler:**
   - Prüfe User-Berechtigungen im Admin-Dashboard
   - Admin-Rolle umgeht alle Berechtigungsprüfungen