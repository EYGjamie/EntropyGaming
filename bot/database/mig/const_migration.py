import sqlite3

# Verbindungen öffnen
src = sqlite3.connect('db/data/test.db')
dst = sqlite3.connect('db/data/entropy.db')

# Cursor erstellen
cur_src = src.cursor()
cur_dst = dst.cursor()

cur_src.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bot_const_ids';")
create_sql = cur_src.fetchone()[0]
cur_dst.execute(create_sql)

# Daten kopieren
cur_src.execute("SELECT * FROM bot_const_ids;")
rows = cur_src.fetchall()
placeholders = ",".join("?" for _ in rows[0])
cur_dst.executemany(f"INSERT INTO bot_const_ids VALUES ({placeholders});", rows)

# Änderungen speichern und Verbindungen schließen
dst.commit()
src.close()
dst.close()
