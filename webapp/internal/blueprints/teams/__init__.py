from flask import Blueprint, render_template, g, request, jsonify, flash, redirect, url_for
from database.db_manager import get_db
from utils.decorators import login_required
from models.team import Team
from models.user import User
import logging
import requests

teams_bp = Blueprint('teams', __name__, url_prefix='/teams')

@teams_bp.route('/')
@login_required
def index():
    """Teams overview page"""
    try:
        # Get filter parameters
        game_filter = request.args.get('game', '')
        search_query = request.args.get('search', '')
        view_mode = request.args.get('view', 'card')  # card oder table
        
        # Get teams data
        if search_query:
            teams = Team.search_teams_with_members(search_query)
        else:
            teams = Team.get_all(game_filter=game_filter)
        
        # Group teams by game für card view
        teams_by_game = {}
        if view_mode == 'card':
            for team in teams:
                if team.game not in teams_by_game:
                    teams_by_game[team.game] = []
                teams_by_game[team.game].append(team)
        
        # Get available games for filter
        available_games = Team.get_available_games()
        
        # Calculate statistics
        total_teams = len(teams)
        total_members = sum(len(team.members) for team in teams)
        
        # Get game statistics
        game_stats = {}
        for game in available_games:
            game_teams = [t for t in teams if t.game == game]
            game_stats[game] = {
                'team_count': len(game_teams),
                'member_count': sum(len(t.members) for t in game_teams),
                'avg_members': round(sum(len(t.members) for t in game_teams) / len(game_teams) if game_teams else 0, 1)
            }
        
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
            teams=teams,
            teams_by_game=teams_by_game,
            available_games=available_games,
            current_game_filter=game_filter,
            current_search=search_query,
            current_view=view_mode,
            total_teams=total_teams,
            total_members=total_members,
            game_stats=game_stats
        )
        
    except Exception as e:
        logging.error(f"Error loading teams page: {e}")
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
            teams=[],
            teams_by_game={},
            available_games=[],
            error="Fehler beim Laden der Teams"
        )

@teams_bp.route('/<int:team_id>')
@login_required
def detail(team_id):
    """Team detail page"""
    try:
        team = Team.get_by_id(team_id)
        
        if not team:
            flash("Team nicht gefunden", "error")
            return redirect(url_for('teams.index'))
        
        return render_template(
            'teams/detail.html',
            user=g.user,
            roles=g.user_roles,
            team=team
        )
        
    except Exception as e:
        logging.error(f"Error loading team {team_id}: {e}")
        flash("Fehler beim Laden des Teams", "error")
        return redirect(url_for('teams.index'))

@teams_bp.route('/api/members/<int:team_id>')
@login_required
def api_team_members(team_id):
    """API endpoint to get team members with pagination"""
    try:
        team = Team.get_by_id(team_id)
        
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort', 'joined_at')
        order = request.args.get('order', 'asc')
        
        # Get all members
        all_members = team._get_members(include_stats=True)
        
        # Sort members
        reverse = (order == 'desc')
        if sort_by == 'name':
            all_members.sort(key=lambda x: x['effective_name'].lower(), reverse=reverse)
        elif sort_by == 'role':
            all_members.sort(key=lambda x: x.get('role', 'Spieler').lower(), reverse=reverse)
        else:  # joined_at
            all_members.sort(key=lambda x: x.get('joined_at', ''), reverse=reverse)
        
        # Paginate
        total = len(all_members)
        start = (page - 1) * per_page
        end = start + per_page
        members = all_members[start:end]
        
        return jsonify({
            'members': members,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching team members API for team {team_id}: {e}")
        return jsonify({'error': 'Fehler beim Laden der Teammitglieder'}), 500

@teams_bp.route('/manage/<int:team_id>')
@login_required
def manage(team_id):
    """Team management page"""
    try:
        team = Team.get_by_id(team_id)
        
        if not team:
            flash("Team nicht gefunden", "error")
            return redirect(url_for('teams.index'))
        
        # Get users not in this team
        db = get_db()
        available_users = db.execute('''
            SELECT u.id, u.username, u.display_name, u.nickname
            FROM users u
            WHERE u.is_bot = 0
            AND u.id NOT IN (
                SELECT tm.user_id 
                FROM team_members tm 
                WHERE tm.team_id = ?
            )
            ORDER BY u.display_name
        ''', (team_id,)).fetchall()
        
        return render_template(
            'teams/manage.html',
            user=g.user,
            roles=g.user_roles,
            team=team,
            available_users=[dict(user) for user in available_users]
        )
        
    except Exception as e:
        logging.error(f"Error loading team management for team {team_id}: {e}")
        flash("Fehler beim Laden der Team-Verwaltung", "error")
        return redirect(url_for('teams.detail', team_id=team_id))

@teams_bp.route('/api/manage/<int:team_id>/add_member', methods=['POST'])
@login_required
def api_add_member(team_id):
    """API endpoint to add a member to a team"""
    # Check permissions
    if not User.has_management_role(g.user):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        role = data.get('role', 'Spieler')
        
        if not user_id:
            return jsonify({'error': 'User ID fehlt'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        if team.add_member(user_id, role):
            return jsonify({'success': True, 'message': 'Mitglied hinzugefügt'})
        else:
            return jsonify({'error': 'Fehler beim Hinzufügen des Mitglieds'}), 500
            
    except Exception as e:
        logging.error(f"Error adding member to team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500

@teams_bp.route('/api/manage/<int:team_id>/remove_member', methods=['POST'])
@login_required
def api_remove_member(team_id):
    """API endpoint to remove a member from a team"""
    if not User.has_management_role(g.user):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID fehlt'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        if team.remove_member(user_id):
            return jsonify({'success': True, 'message': 'Mitglied entfernt'})
        else:
            return jsonify({'error': 'Fehler beim Entfernen des Mitglieds'}), 500
            
    except Exception as e:
        logging.error(f"Error removing member from team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500

@teams_bp.route('/api/manage/<int:team_id>/update_role', methods=['POST'])
@login_required
def api_update_member_role(team_id):
    """API endpoint to update a member's role"""
    # Check permissions
    if not User.has_management_role(g.user):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        new_role = data.get('role', 'Spieler')
        
        if not user_id:
            return jsonify({'error': 'User ID fehlt'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        if team.update_member_role(user_id, new_role):
            return jsonify({'success': True, 'message': 'Rolle aktualisiert'})
        else:
            return jsonify({'error': 'Fehler beim Aktualisieren der Rolle'}), 500
            
    except Exception as e:
        logging.error(f"Error updating member role in team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500

@teams_bp.route('/api/stats')
@login_required
def api_team_stats():
    """API endpoint for team statistics"""
    try:
        db = get_db()
        
        # Basic stats
        total_teams = db.execute(
            'SELECT COUNT(*) as count FROM team_areas WHERE is_active = 1'
        ).fetchone()['count']
        
        total_members = db.execute('''
            SELECT COUNT(DISTINCT tm.user_id) as count 
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE u.is_bot = 0
        ''').fetchone()['count']
        
        # Teams per game
        teams_per_game = db.execute('''
            SELECT game, COUNT(*) as count
            FROM team_areas 
            WHERE is_active = 1
            GROUP BY game
            ORDER BY count DESC
        ''').fetchall()
        
        # Members per team
        members_per_team = db.execute('''
            SELECT 
                t.team_name,
                t.game,
                COUNT(tm.user_id) as member_count
            FROM team_areas t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            LEFT JOIN users u ON tm.user_id = u.id AND u.is_bot = 0
            WHERE t.is_active = 1
            GROUP BY t.id, t.team_name, t.game
            ORDER BY member_count DESC
            LIMIT 10
        ''').fetchall()
        
        # Role distribution
        role_distribution = db.execute('''
            SELECT 
                COALESCE(tm.role, 'Spieler') as role,
                COUNT(*) as count
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE u.is_bot = 0
            GROUP BY tm.role
            ORDER BY count DESC
        ''').fetchall()
        
        return jsonify({
            'basic_stats': {
                'total_teams': total_teams,
                'total_members': total_members
            },
            'teams_per_game': [dict(row) for row in teams_per_game],
            'members_per_team': [dict(row) for row in members_per_team],
            'role_distribution': [dict(row) for row in role_distribution]
        })
        
    except Exception as e:
        logging.error(f"Error fetching team stats: {e}")
        return jsonify({'error': 'Fehler beim Laden der Statistiken'}), 500
    
@teams_bp.route('/edit/<int:team_id>')
@login_required
def edit(team_id):
    """Team edit page"""
    # Check permissions
    if not User.has_management_role(g.user):
        flash("Keine Berechtigung zum Bearbeiten von Teams", "error")
        return redirect(url_for('teams.detail', team_id=team_id))
    
    try:
        team = Team.get_by_id(team_id)
        
        if not team:
            flash("Team nicht gefunden", "error")
            return redirect(url_for('teams.index'))
        
        # Verfügbare Rollen definieren
        available_roles = ['Captain', 'Player', 'Manager', 'Coach']
        
        return render_template(
            'teams/edit.html',
            user=g.user,
            roles=g.user_roles,
            team=team,
            available_roles=available_roles
        )
        
    except Exception as e:
        logging.error(f"Error loading team edit for team {team_id}: {e}")
        flash("Fehler beim Laden der Team-Bearbeitung", "error")
        return redirect(url_for('teams.detail', team_id=team_id))

# API Endpunkt für Rollenänderung von Mitgliedern
@teams_bp.route('/api/edit/<int:team_id>/update_member_role', methods=['POST'])
@login_required
def api_update_member_role_edit(team_id):
    """API endpoint to update a member's role in team edit"""
    # Check permissions
    if not User.has_management_role(g.user):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        new_role = data.get('role')
        
        if not user_id or not new_role:
            return jsonify({'error': 'User ID und Rolle sind erforderlich'}), 400
        
        # Validiere Rolle
        valid_roles = ['Captain', 'Player', 'Manager', 'Coach']
        if new_role not in valid_roles:
            return jsonify({'error': 'Ungültige Rolle'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        if team.update_member_role(user_id, new_role):
            return jsonify({'success': True, 'message': f'Rolle zu {new_role} geändert'})
        else:
            return jsonify({'error': 'Fehler beim Aktualisieren der Rolle'}), 500
            
    except Exception as e:
        logging.error(f"Error updating member role in team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500

# API Endpunkt für Mitglieder entfernen mit Discord Bot API Call
@teams_bp.route('/api/edit/<int:team_id>/remove_member', methods=['POST'])
@login_required
def api_remove_member_edit(team_id):
    """API endpoint to remove a member from team via Discord bot"""
    if not User.has_management_role(g.user):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID fehlt'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        # API Call zum Discord Bot
        try:
            bot_response = requests.delete(
                f'http://localhost:321/api/teams/member/delete/{user_id}',
                params={'team_id': team_id},
                timeout=10
            )
            
            if bot_response.status_code == 200:
                # Auch aus lokaler DB entfernen
                if team.remove_member(user_id):
                    return jsonify({'success': True, 'message': 'Mitglied erfolgreich entfernt'})
                else:
                    return jsonify({'error': 'Mitglied vom Discord entfernt, aber DB-Fehler'}), 500
            else:
                return jsonify({'error': f'Discord Bot Fehler: {bot_response.status_code}'}), 500
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Error calling Discord bot API for member removal: {e}")
            return jsonify({'error': 'Fehler beim Kommunizieren mit Discord Bot'}), 500
            
    except Exception as e:
        logging.error(f"Error removing member from team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500

# API Endpunkt für Team-Namen ändern mit Discord Bot API Call
@teams_bp.route('/api/edit/<int:team_id>/change_name', methods=['POST'])
@login_required
def api_change_team_name(team_id):
    """API endpoint to change team name via Discord bot"""
    if not User.has_management_role(g.user_roles):
        return jsonify({'error': 'Keine Berechtigung'}), 403
    
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()
        
        if not new_name:
            return jsonify({'error': 'Team-Name ist erforderlich'}), 400
        
        if len(new_name) < 2 or len(new_name) > 50:
            return jsonify({'error': 'Team-Name muss zwischen 2 und 50 Zeichen lang sein'}), 400
        
        team = Team.get_by_id(team_id)
        if not team:
            return jsonify({'error': 'Team nicht gefunden'}), 404
        
        # API Call zum Discord Bot
        try:
            bot_response = requests.post(
                f'http://localhost:321/api/teams/name/change/{team_id}',
                json={'name': new_name},
                timeout=10
            )
            
            if bot_response.status_code == 200:
                # Auch in lokaler DB ändern
                db = get_db()
                db.execute(
                    'UPDATE team_areas SET team_name = ? WHERE id = ?',
                    (new_name, team_id)
                )
                db.commit()
                
                return jsonify({'success': True, 'message': 'Team-Name erfolgreich geändert'})
            else:
                return jsonify({'error': f'Discord Bot Fehler: {bot_response.status_code}'}), 500
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Error calling Discord bot API for name change: {e}")
            return jsonify({'error': 'Fehler beim Kommunizieren mit Discord Bot'}), 500
            
    except Exception as e:
        logging.error(f"Error changing team name for team {team_id}: {e}")
        return jsonify({'error': 'Interner Serverfehler'}), 500