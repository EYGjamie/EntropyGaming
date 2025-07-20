import sqlite3

# Verbindungen öffnen
src = sqlite3.connect('quelle.db')
dst = sqlite3.connect('ziel.db')

# Cursor erstellen
cur_src = src.cursor()
cur_dst = dst.cursor()

# Daten kopieren
cur_src.execute("SELECT * FROM bot_const_ids;")
rows = cur_src.fetchall()
placeholders = ",".join("?" for _ in rows[0])
cur_dst.executemany(f"INSERT INTO bot_const_ids VALUES ({placeholders});", rows)

# Änderungen speichern und Verbindungen schließen
dst.commit()
src.close()
dst.close()
