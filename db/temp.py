import sqlite3
import os
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

def get_database_path():
    """Ermittelt den Datenbankpfad basierend auf Umgebungsvariablen."""
    if os.getenv("IS_PROD") == "true":
        db_path = os.getenv("DATABASE_PATH_PROD")
    else:
        db_path = os.getenv("DATABASE_PATH_DEV")
    
    # Fallback für lokale Entwicklung
    if not db_path:
        db_path = "db/data/entropy.db"
    
    return db_path

def create_quiz_questions():
    """Erstellt die Liste aller 100 Quiz-Fragen."""
    questions = [
        # CS2 Questions (1-20)
        ("Welche Granate verursacht am meisten Schaden an der Rüstung?", "HE-Granate", "Blendgranate", "Rauchgranate", 1, "CS2"),
        ("Wie viele Rounds muss ein Team in einem Competitive Match gewinnen?", "13", "15", "16", 3, "CS2"),
        ("Welche Waffe hat die höchste Bewegungsgeschwindigkeit?", "Messer", "P90", "Glock-18", 1, "CS2"),
        ("Was passiert, wenn die Bombe nach 35 Sekunden nicht entschärft wird?", "Die Runde geht weiter", "Terroristen gewinnen automatisch", "Overtime beginnt", 2, "CS2"),
        ("Welche Map wurde 2023 aus dem Active Duty Pool entfernt?", "Dust2", "Cache", "Mirage", 2, "CS2"),
        ("Wie viel kostet eine AK-47?", "2700$", "3100$", "2500$", 1, "CS2"),
        ("Welcher Befehl zeigt die FPS an?", "fps_max", "net_graph 1", "cl_showfps", 2, "CS2"),
        ("Wie heißt die berühmte Scharfschützenposition auf Dust2?", "Goose", "Car", "Pit", 1, "CS2"),
        ("Welche Waffe kann durch zwei Türen schießen?", "AWP", "AK-47", "M4A4", 1, "CS2"),
        ("Was bedeutet 'Eco Round'?", "Alle kaufen vollständige Ausrüstung", "Sparen von Geld, minimale Käufe", "Nur Pistolen kaufen", 2, "CS2"),
        ("Welche Taste ist standardmäßig für das Spraymuster zuständig?", "Mausrad", "Linke Maustaste gedrückt halten", "Rechte Maustaste", 2, "CS2"),
        ("Wie viele Sekunden hat man Zeit, die Bombe zu entschärfen?", "5 Sekunden", "10 Sekunden", "7 Sekunden", 2, "CS2"),
        ("Welcher Spielmodus war der Vorgänger von Wingman?", "Arms Race", "Demolition", "Flying Scoutsman", 2, "CS2"),
        ("Was ist die maximale Geld-Anzahl pro Spieler?", "16000$", "12000$", "10000$", 1, "CS2"),
        ("Welche Granate kann Gegner durch Wände verletzen?", "Molotov", "HE-Granate", "Keine", 3, "CS2"),
        ("Wie heißt der mittlere Bereich auf der Map Mirage?", "Mid", "Connector", "Palace", 2, "CS2"),
        ("Welches Land hat die meisten CS2 Major-Turniere gewonnen?", "Schweden", "Dänemark", "Frankreich", 2, "CS2"),
        ("Was zeigt 'cl_crosshairstyle 4' an?", "Dynamisches Fadenkreuz", "Statisches Fadenkreuz", "Klassisches Fadenkreuz", 2, "CS2"),
        ("Welche Waffe hat das größte Magazin bei den Rifles?", "Galil AR", "FAMAS", "SG 553", 1, "CS2"),
        ("Was ist 'Prefiring'?", "Schießen vor dem Zielen", "Schießen bevor Gegner sichtbar ist", "Schießen ohne Munition", 2, "CS2"),
        
        # Rainbow 6 Questions (21-40)
        ("Welcher Operator kann Kameras hacken?", "Dokkaebi", "IQ", "Twitch", 1, "Rainbow 6"),
        ("Wie heißt Ash's Spezialfähigkeit?", "Breaching Round", "Cluster Charge", "Shock Drone", 1, "Rainbow 6"),
        ("Welcher Verteidiger kann 'Silent Step' verwenden?", "Caveira", "Vigil", "Alibi", 1, "Rainbow 6"),
        ("Wie viele Verstärkungen hat jedes Verteidigerteam insgesamt?", "8", "10", "12", 2, "Rainbow 6"),
        ("Welcher Operator hat eine Adrenalin-Spritze?", "Doc", "Finka", "Vigil", 2, "Rainbow 6"),
        ("Was macht Mute's Jammer?", "Blockiert Funk-Geräte", "Verstärkt Wände", "Heilt Teammitglieder", 1, "Rainbow 6"),
        ("Welche Map findet in einem Flugzeug statt?", "Plane", "House", "Yacht", 1, "Rainbow 6"),
        ("Wie heißt Thermite's Gadget?", "Exothermic Charge", "Breach Charge", "Cluster Charge", 1, "Rainbow 6"),
        ("Welcher Operator kann unsichtbar werden?", "Vigil", "Nokk", "Caveira", 2, "Rainbow 6"),
        ("Was passiert, wenn Twitch's Schock-Drohne einen Gegner trifft?", "10 HP Schaden", "Betäubung", "Markierung", 1, "Rainbow 6"),
        ("Welcher Operator kann durch Böden schauen?", "IQ", "Pulse", "Jackal", 2, "Rainbow 6"),
        ("Wie viele Runden dauert ein Ranked Match maximal?", "9", "12", "15", 1, "Rainbow 6"),
        ("Welcher Operator hat eine 'Black Eye' Kamera?", "Valkyrie", "Maestro", "Echo", 1, "Rainbow 6"),
        ("Was macht Lion's Drohne?", "Zeigt sich bewegende Gegner", "Schockt Gegner", "Heilt Teammitglieder", 1, "Rainbow 6"),
        ("Welche Waffe ist Jäger's primäre Waffe?", "416-C Carbine", "MP7", "G8A1", 1, "Rainbow 6"),
        ("Was ist das Ziel im 'Bomb' Spielmodus?", "Geisel retten", "Bombe entschärfen", "Bereich sichern", 2, "Rainbow 6"),
        ("Welcher Operator kann Löcher in verstärkte Wände machen?", "Sledge", "Thermite", "Buck", 2, "Rainbow 6"),
        ("Wie heißt die Map mit dem Weinkeller?", "Villa", "Kafe", "Chalet", 2, "Rainbow 6"),
        ("Welcher Operator hat 'Candela' Granaten?", "Ying", "Blitz", "Fuze", 1, "Rainbow 6"),
        ("Was macht Rook's Gadget?", "Verteilt Körperpanzer", "Verstärkt Türen", "Heilt Spieler", 1, "Rainbow 6"),
        
        # League of Legends Questions (41-60)
        ("Welcher Champion wird als 'The Blade Dancer' bezeichnet?", "Katarina", "Irelia", "Fiora", 2, "League of Legends"),
        ("Wie viele Inhibitoren hat jedes Team?", "2", "3", "4", 2, "League of Legends"),
        ("Was gibt der Baron-Buff?", "Mehr Schaden und verstärkte Minions", "Nur mehr Schaden", "Nur verstärkte Minions", 1, "League of Legends"),
        ("Welcher Champion hat die Fähigkeit 'Death Sentence'?", "Blitzcrank", "Thresh", "Nautilus", 2, "League of Legends"),
        ("Wie heißt die Karte in League of Legends?", "Summoner's Rift", "Runeterra", "Nexus", 1, "League of Legends"),
        ("Welches Item gibt die meiste Bewegungsgeschwindigkeit?", "Boots of Mobility", "Boots of Swiftness", "Berserker's Greaves", 1, "League of Legends"),
        ("Wie viele verschiedene Drachen gibt es?", "4", "5", "6", 2, "League of Legends"),
        ("Was passiert bei Level 18?", "Maximales Level erreicht", "Neue Fähigkeiten freigeschaltet", "Bonus-Gold erhalten", 1, "League of Legends"),
        ("Welcher Champion ist bekannt für 'Dredge Line'?", "Pyke", "Nautilus", "Fizz", 2, "League of Legends"),
        ("Was bedeutet 'CS' in League of Legends?", "Champion Score", "Creep Score", "Combat Score", 2, "League of Legends"),
        ("Welcher Champion kann sich in andere Champions verwandeln?", "Shaco", "Neeko", "LeBlanc", 2, "League of Legends"),
        ("Wie lange dauert eine durchschnittliche Ranked-Partie?", "15-20 Minuten", "25-35 Minuten", "45-60 Minuten", 2, "League of Legends"),
        ("Was ist das teuerste Standard-Item?", "Trinity Force", "Infinity Edge", "Variiert je nach Patch", 3, "League of Legends"),
        ("Was macht Flash (Blitz)?", "Teleportiert kurze Distanz", "Macht unsichtbar", "Heilt den Champion", 1, "League of Legends"),
        ("Welcher Champion ist der 'Monkey King'?", "Wukong", "Master Yi", "Xin Zhao", 1, "League of Legends"),
        ("Wie viele Spieler sind in einem Team?", "4", "5", "6", 2, "League of Legends"),
        ("Was ist 'Pentakill'?", "5 Assists in einer Runde", "5 Kills in kurzer Zeit", "5 Champions in einem Team", 2, "League of Legends"),
        ("Welcher Champion hat die Ultimate 'Absolute Zero'?", "Nunu", "Anivia", "Lissandra", 1, "League of Legends"),
        ("Was bedeutet 'KDA'?", "Kills/Deaths/Assists", "Kill Death Average", "Korean Diamond Armor", 1, "League of Legends"),
        ("Welcher Summoner Spell reduziert gegnerischen Schaden?", "Barrier", "Exhaust", "Heal", 2, "League of Legends"),
        
        # Valorant Questions (61-75)
        ("Welcher Agent kann durch Wände teleportieren?", "Yoru", "Jett", "Omen", 1, "Valorant"),
        ("Wie viele Spikes gibt es pro Runde?", "1", "2", "3", 1, "Valorant"),
        ("Welche Waffe kostet 2900 Credits?", "Vandal", "Phantom", "Operator", 1, "Valorant"),
        ("Was macht Sage's Ultimate?", "Heilt alle Teammitglieder", "Erweckt einen Spieler wieder", "Erstellt eine Barriere", 2, "Valorant"),
        ("Welcher Agent hat 'Toxic Screen'?", "Viper", "Omen", "Astra", 1, "Valorant"),
        ("Wie viele Rounds muss ein Team gewinnen?", "12", "13", "15", 2, "Valorant"),
        ("Was ist die teuerste Waffe?", "Operator", "Odin", "Ares", 1, "Valorant"),
        ("Welcher Agent kann fliegen?", "Jett", "Phoenix", "Raze", 1, "Valorant"),
        ("Was macht Phoenix's Ultimate?", "Mehr Schaden", "Respawn am Startpunkt nach Tod", "Heilt Teammitglieder", 2, "Valorant"),
        ("Welche Map hat eine Mittel-Teleporter?", "Bind", "Haven", "Split", 1, "Valorant"),
        ("Wie viele Fähigkeiten hat jeder Agent?", "3", "4", "5", 2, "Valorant"),
        ("Was bedeutet 'Eco Round' in Valorant?", "Vollkauf der Ausrüstung", "Sparen der Credits", "Nur Ultimate verwenden", 2, "Valorant"),
        ("Welcher Agent kann Drohnen kontrollieren?", "Sova", "Cypher", "Killjoy", 1, "Valorant"),
        ("Was passiert in der 'Sudden Death' Runde?", "Alle haben volle Ausrüstung", "Keine Fähigkeiten verfügbar", "Pistolen only", 3, "Valorant"),
        ("Welcher Agent hat 'Spycam'?", "Cypher", "Sova", "Killjoy", 1, "Valorant"),
        
        # Clash of Clans Questions (76-90)
        ("Was ist die maximale Anzahl der Bauarbeiter?", "5", "6", "7", 2, "Clash of Clans"),
        ("Welche Truppe hat die meisten Trefferpunkte?", "Golem", "Lava Hound", "P.E.K.K.A", 1, "Clash of Clans"),
        ("Wie viele Sterne bekommt man für einen 100% Angriff?", "2", "3", "4", 2, "Clash of Clans"),
        ("Was produziert dunkles Elixier?", "Dark Elixir Drill", "Elixir Collector", "Gold Mine", 1, "Clash of Clans"),
        ("Welche Einheit kann über Mauern fliegen?", "Dragon", "Giant", "Wizard", 1, "Clash of Clans"),
        ("Was ist die Hauptwährung für Gebäude-Upgrades?", "Gold", "Elixier", "Beide", 3, "Clash of Clans"),
        ("Welcher Zauber macht Truppen unsichtbar?", "Invisibility Spell", "Rage Spell", "Healing Spell", 1, "Clash of Clans"),
        ("Wie viele Clanmitglieder passen maximal in einen Clan?", "40", "50", "60", 2, "Clash of Clans"),
        ("Was ist das maximale Rathaus-Level?", "14", "15", "16", 3, "Clash of Clans"),
        ("Welche Verteidigung schießt am weitesten?", "Eagle Artillery", "X-Bow", "Inferno Tower", 1, "Clash of Clans"),
        ("Was macht der 'Freeze Trap'?", "Verlangsamt Angreifer", "Stoppt Angreifer komplett", "Schadet Angreifern", 1, "Clash of Clans"),
        ("Welche Truppe kostet Dark Elixir?", "Minion", "Archer", "Giant", 1, "Clash of Clans"),
        ("Was passiert mit nicht verwendeten Truppen nach einem Angriff?", "Sie verschwinden", "Sie kehren zurück", "Sie werden zu Erfahrung", 2, "Clash of Clans"),
        ("Welches Gebäude muss zerstört werden, um einen Stern zu bekommen?", "Rathaus", "Clan Castle", "Archer Tower", 1, "Clash of Clans"),
        ("Was ist die schnellste Truppe im Spiel?", "Wall Breaker", "Goblin", "Minion", 2, "Clash of Clans"),
        
        # Rocket League Questions (91-100)
        ("Wie groß ist ein Standard-Feld?", "100x60 Units", "120x80 Units", "140x100 Units", 1, "Rocket League"),
        ("Was ist die höchste Geschwindigkeit ohne Boost?", "1400 uu/s", "1410 uu/s", "1440 uu/s", 2, "Rocket League"),
        ("Wie viel Boost fasst ein großer Boost-Pad?", "100", "75", "50", 1, "Rocket League"),
        ("Was bedeutet 'Flip Reset'?", "Ball zurücksetzen", "Sprung zurückbekommen durch Ballkontakt", "Auto umdrehen", 2, "Rocket League"),
        ("Welcher Rang kommt direkt nach Diamond III?", "Champion I", "Grand Champion", "Platinum I", 1, "Rocket League"),
        ("Wie viele kleine Boost-Pads gibt es auf dem Feld?", "28", "32", "36", 1, "Rocket League"),
        ("Was ist 'Wave Dash'?", "Spezielle Landetechnik für Geschwindigkeit", "Sprung über die Welle", "Ball-Wurf Technik", 1, "Rocket League"),
        ("Wie lange dauert Overtime maximal?", "Es gibt kein Limit", "10 Minuten", "5 Minuten", 1, "Rocket League"),
        ("Was ist ein 'Double Touch'?", "Ball zweimal hintereinander berühren", "Zwei Spieler berühren Ball gleichzeitig", "Ball vom Torpfosten ins Tor", 1, "Rocket League"),
        ("Welche Taste ist standardmäßig für 'Air Roll'?", "X (Xbox) / Quadrat (PS)", "A (Xbox) / X (PS)", "LB (Xbox) / L1 (PS)", 1, "Rocket League"),
    ]
    
    random.shuffle(questions)
    return questions

def insert_quiz_questions():
    """Fügt alle Quiz-Fragen in die Datenbank ein."""
    
    # Datenbankpfad ermitteln
    db_path = get_database_path()
    
    if not os.path.exists(db_path):
        print(f"❌ Datenbank nicht gefunden: {db_path}")
        print("💡 Stelle sicher, dass die Umgebungsvariablen korrekt gesetzt sind:")
        print("   - IS_PROD (true/false)")
        print("   - DATABASE_PATH_PROD oder DATABASE_PATH_DEV")
        return False
    
    # Startdatum (morgen)
    start_date = datetime(2025, 7, 21)
    
    # Fragen erstellen
    questions = create_quiz_questions()
    
    try:
        # Datenbankverbindung
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print(f"🔗 Verbunden mit Datenbank: {db_path}")
        print(f"📅 Einfügen von {len(questions)} Fragen ab {start_date.strftime('%Y-%m-%d')}")
        print("-" * 60)
        
        inserted_count = 0
        skipped_count = 0
        
        for i, (question, answer1, answer2, answer3, correct, category) in enumerate(questions):
            # Datum für diese Frage (jeden Tag eine neue Frage)
            question_date = start_date + timedelta(days=i)
            date_str = question_date.strftime('%Y-%m-%d')
            
            try:
                # Frage einfügen
                cursor.execute("""
                    INSERT INTO quiz_questions 
                    (scheduled_date, question, answer1, answer2, answer3, correct, category, asked) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """, (date_str, question, answer1, answer2, answer3, correct, category))
                
                inserted_count += 1
                print(f"✅ {date_str} | {category:15} | {question[:50]}...")
                
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    skipped_count += 1
                    print(f"⚠️  {date_str} | {category:15} | Bereits vorhanden - übersprungen")
                else:
                    raise e
        
        # Änderungen speichern
        conn.commit()
        
        print("-" * 60)
        print(f"✅ Erfolgreich abgeschlossen!")
        print(f"📊 Eingefügt: {inserted_count} Fragen")
        print(f"⏭️  Übersprungen: {skipped_count} Fragen (bereits vorhanden)")
        print(f"📆 Letztes Datum: {(start_date + timedelta(days=len(questions)-1)).strftime('%Y-%m-%d')}")
        
        # Statistik nach Kategorien
        print("\n📈 Verteilung nach Spielen:")
        category_counts = {}
        for _, _, _, _, _, category in questions:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        for category, count in sorted(category_counts.items()):
            print(f"   {category:15}: {count:2} Fragen")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Datenbankfehler: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Unerwarteter Fehler: {e}")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def verify_insertion():
    """Überprüft, ob die Fragen korrekt eingefügt wurden."""
    
    db_path = get_database_path()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n🔍 Verifizierung der eingefügten Fragen...")
        
        # Gesamtanzahl
        cursor.execute("SELECT COUNT(*) FROM quiz_questions")
        total_count = cursor.fetchone()[0]
        print(f"📊 Gesamtanzahl Fragen in DB: {total_count}")
        
        # Anzahl nach Kategorie
        cursor.execute("""
            SELECT category, COUNT(*) 
            FROM quiz_questions 
            GROUP BY category 
            ORDER BY category
        """)
        
        print("\n📈 Fragen nach Kategorie:")
        for category, count in cursor.fetchall():
            print(f"   {category:15}: {count:2} Fragen")
        
        # Nächste 5 Fragen anzeigen
        cursor.execute("""
            SELECT scheduled_date, category, question 
            FROM quiz_questions 
            WHERE scheduled_date >= date('now') 
            ORDER BY scheduled_date 
            LIMIT 5
        """)
        
        upcoming = cursor.fetchall()
        if upcoming:
            print("\n📅 Nächste 5 geplante Fragen:")
            for date, category, question in upcoming:
                print(f"   {date} | {category:12} | {question[:50]}...")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Fehler bei Verifizierung: {e}")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """Hauptfunktion des Scripts."""
    
    print("🎮 Quiz Questions Database Inserter")
    print("=" * 60)
    
    # Fragen einfügen
    success = insert_quiz_questions()
    
    if success:
        # Verifizierung
        verify_insertion()
        print(f"\n🎉 Alle Fragen wurden erfolgreich eingefügt!")
        print(f"⏰ Der Discord-Bot wird ab morgen täglich eine neue Frage posten.")
    else:
        print(f"\n❌ Es gab Probleme beim Einfügen der Fragen.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())