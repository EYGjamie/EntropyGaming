# Entropy Gaming

Das Projekt beinhaltet den Source Code für den internen Bot & die interne Webseite

## ToDo

- Create Ticket als Befehl einbauen
- Transcripts Ordner auslagern?
- create_team_area Anzahl VoiceChannel hinzufügen?

## 📁 Projektstruktur

```
bot/                           # Discord Bot (Go)
├── discord/                   # Bot-Logik
├── database/                  # Datenbankverbindung
├── handlers/                  # Command & Event Handler
├── utils/                    # Utils
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

## 📄 Lizenz

Dieses Projekt ist für interne Nutzung gedacht.

**Hinweis:** Dies ist eine interne Webseite für Organisationsmitglieder. Der Zugang ist auf autorisierte Benutzer beschränkt.