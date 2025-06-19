package main

import (
	"log"
	"bot/database"
	"bot/discord"

	"github.com/joho/godotenv"
)

func main() {
	// Lade .env-Datei
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Fehler beim Laden der .env-Datei: %v", err)
	}

	// Starte Datenbankverbindung
	database.InitDB()

	// Starte den Discord-Bot
	err = discord.StartBot()
	if err != nil {
		log.Fatalf("Fehler beim Starten des Bots: %v", err)
	}
}
