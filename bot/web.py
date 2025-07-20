from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
import os
import json
from datetime import datetime, date, timedelta
from calendar import monthrange
import glob
import html
import sqlite3
from dotenv import load_dotenv

load_dotenv()

#------------------------------------------------------------------------------------------------------------#

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'EpW3P6NQ1RmL4QYsy%yP7S$j7m#5p4EV4MTJ#Y@FsRYTp6YpWxKS4gLn^HgFWXwb...')

#------------------------------------------------------------------------------------------------------------#

COLOR_LIST = [
    "#FF0000", "#008000", "#0000FF", "#800080", "#FFA500",
    "#00FFFF", "#808000", "#FF00FF", "#800000", "#008080",
    "#808080", "#FFC0CB", "#808000", "#A52A2A", "#F0E68C",
    "#4682B4", "#D2691E", "#9ACD32", "#4B0082", "#B22222"
]
color_map = {}  # user_id -> Farbcode
next_color_index = 0  # behält den Index für die nächste Farbe

#------------------------------------------------------------------------------------------------------------#

PASSWORD = os.getenv('TICKET_PASSWORD', 'entropydia')
TRANSCRIPTS_DIR = 'bot/transcripts'

#------------------------------------------------------------------------------------------------------------#

def get_user_color(user_id):
    global next_color_index

    if user_id not in color_map:
        color_map[user_id] = COLOR_LIST[next_color_index % len(COLOR_LIST)]
        next_color_index += 1

    if next_color_index >= len(COLOR_LIST):
        next_color_index = 0

    return color_map[user_id]

#------------------------------------------------------------------------------------------------------------#

def load_transcript(ticket_id):
    try:
        file_pattern = os.path.join("C:/Users/Administrator/Documents/GitHub/EntropyGaming/bot/transcripts", f'{ticket_id}_*.json')
        files = glob.glob(file_pattern)
        if not files:
            return None

        with open(files[0], 'r', encoding='utf-8') as file:
            messages = json.load(file)
            for message in messages:
                message['message'] = html.unescape(message['message'])
                message['timestamp'] = datetime.strptime(
                    message['timestamp'], '%Y-%m-%dT%H:%M:%SZ'
                ).strftime('%d.%m.%Y %H:%M')
                message['color'] = get_user_color(message['userID'])
                
                if 'attachments' in message and message['attachments']:
                    for attach in message['attachments']:
                        attach['localPath'] = url_for(
                            'attachments', ticket_id=ticket_id, filename=attach['filename']
                        )
            return messages
    except Exception as e:
        print(f"Fehler beim Laden des Tickets: {e}")
        return None

#------------------------------------------------------------------------------------------------------------#

@app.route('/ticket/<ticket_id>', methods=['GET', 'POST'])
def view_ticket(ticket_id):
    if 'authenticated' not in session or not session['authenticated']:
        if request.method == 'POST':
            password = request.form.get('password')
            if password == PASSWORD:
                session['authenticated'] = True
                return redirect(url_for('view_ticket', ticket_id=ticket_id))
            else:
                return render_template('login.html', error='Falsches Passwort')
        return render_template('login.html')
    
    messages = load_transcript(ticket_id)
    if messages is None:
        return 'Ticket nicht gefunden', 404

    return render_template('ticket.html', transcript=messages, ticket_id=ticket_id)

#------------------------------------------------------------------------------------------------------------#

@app.route('/attachments/<ticket_id>/<filename>')
def attachments(ticket_id, filename):
    attachment_folder = os.path.join("transcripts", 'attachements', ticket_id)
    return send_from_directory(attachment_folder, filename)

#------------------------------------------------------------------------------------------------------------#
# Neue Route für den QuizBot
@app.route('/quizBot', methods=['GET', 'POST'])
def quiz_bot():
    # Sicherstellen, dass der Nutzer angemeldet ist
    if 'authenticated' not in session or not session['authenticated']:
        if request.method == 'POST':
            password = request.form.get('password')
            if password == PASSWORD:
                session['authenticated'] = True
                return redirect(url_for('quiz_bot'))
            else:
                return render_template('login.html', error='Falsches Passwort')
        return render_template('login.html')
    
    db_path = "C:/Users/Administrator/Documents/GitHub/EntropyGaming/db/data/entropy.db"
    
    # POST: Speichern/Updaten der Daten via AJAX
    if request.method == 'POST':
        data = request.get_json()
        if not data or 'questions' not in data:
            return 'Ungültige Daten', 400

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        for q in data['questions']:
            # Wir ignorieren q.get('id') und verwenden nur das Datum als Schlüssel
            cur.execute('''
                INSERT INTO quiz_questions
                    (scheduled_date, question, answer1, answer2, answer3, correct, category, asked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(scheduled_date) DO UPDATE
                SET question       = excluded.question,
                    answer1        = excluded.answer1,
                    answer2        = excluded.answer2,
                    answer3        = excluded.answer3,
                    correct        = excluded.correct,
                    category       = excluded.category,
                    asked          = excluded.asked
            ''', (
                q['scheduled_date'],
                q['question'],
                q['answer1'],
                q['answer2'],
                q['answer3'],
                q['correct'],
                q['category'],
                int(q['asked'])
            ))

        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})
    
    # GET: Alle Tage des (gewählten oder aktuellen) Monats anzeigen
    month_str = request.args.get('month')
    if not month_str:
        # Standard: aktueller Monat (YYYY-MM)
        month_str = datetime.now().strftime('%Y-%m')
    
    # month_str -> Jahr und Monat
    try:
        year, month_num = map(int, month_str.split('-'))
    except ValueError:
        return 'Ungültiger month-Parameter', 400
    
    # Anzahl Tage im gewählten Monat
    days_in_month = monthrange(year, month_num)[1]
    start_date = date(year, month_num, 1)
    end_date = date(year, month_num, days_in_month)
    
    # Alle Quiz-Einträge in diesem Monatsbereich laden
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        SELECT id, question, answer1, answer2, answer3, correct, category, scheduled_date, asked
        FROM quiz_questions
        WHERE DATE(scheduled_date) BETWEEN DATE(?) AND DATE(?)
        ORDER BY scheduled_date ASC
    ''', (start_date.isoformat(), end_date.isoformat()))
    db_rows = cur.fetchall()
    conn.close()
    
    # In ein dict { "YYYY-MM-DD": {...} } wandeln
    existing_by_date = {}
    for row in db_rows:
        # row[7] = scheduled_date
        d_str = row[7]
        existing_by_date[d_str] = {
            'id': row[0],
            'question': row[1],
            'answer1': row[2],
            'answer2': row[3],
            'answer3': row[4],
            'correct': row[5],
            'category': row[6],
            'scheduled_date': row[7],
            'asked': bool(row[8])
        }
    
    # Für jeden Tag des Monats einen Eintrag anlegen (entweder DB-Werte oder leere Felder)
    question_list = []
    for day_offset in range(days_in_month):
        current_day = (start_date + timedelta(days=day_offset))
        d_str = current_day.isoformat()
        if d_str in existing_by_date:
            question_list.append(existing_by_date[d_str])
        else:
            # Leerer Eintrag
            question_list.append({
                'id': None,
                'question': '',
                'answer1': '',
                'answer2': '',
                'answer3': '',
                'correct': 1,
                'category': '',
                'scheduled_date': d_str,
                'asked': False
            })
    
    return render_template('quiz_bot.html', questions=question_list, month=month_str)

#------------------------------------------------------------------------------------------------------------#
if __name__ == '__main__':
    app.run(debug=False)
