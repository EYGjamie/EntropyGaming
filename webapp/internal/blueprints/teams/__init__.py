from flask import Blueprint, render_template, g, request, jsonify
from database.db_manager import get_db
from utils.decorators import login_required
from models.team import Team
import logging

teams_bp = Blueprint('teams', __name__, url_prefix='/teams')

@teams_bp.route('/')
@login_required
def index():
    """Teams overview page"""
    try:
        # Get filter parameters
        game_filter = request.args.get('game', '')
        search_query = request.args.get('search', '')
        
        # Get teams data
        teams_data = get_teams_data(game_filter, search_query)
        
        # Get available games for filter
        available_games = get_available_games()
        
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
            teams_data=teams_data,
            available_games=available_games,
            current_game_filter=game_filter,
            current_search=search_query
        )
        
    except Exception as e:
        logging.error(f"Error loading teams page: {e}")
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
            teams_data={},
            available_games=[],
            error="Fehler beim Laden der Teams"
        )

@teams_bp.route('/api/teams')
@login_required
def api_teams():
    """API endpoint for teams data"""
    try:
        game_filter = request.args.get('game', '')
        search_query = request.args.get('search', '')
        
        teams_data = get_teams_data(game_filter, search_query)
        
        return jsonify({
            'success': True,
            'data': teams_data
        })
        
    except Exception as e:
        logging.error(f"Error in teams API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Teams'
        }), 500

@teams_bp.route('/<int:team_id>')
@login_required
def detail(team_id):
    """Team detail page"""
    try:
        team = Team.get_by_id(team_id)
        
        if not team:
            return render_template(
                'error.html',
                error_code=404,
                error_message="Team nicht gefunden"
            ), 404
        
        # Get team members (if available)
        team_members = get_team_members(team_id)
        
        # Get team statistics
        team_stats = get_team_stats(team_id)
        
        return render_template(
            'teams/detail.html',
            user=g.user,
            roles=g.user_roles,
            team=team,
            team_members=team_members,
            team_stats=team_stats
        )
        
    except Exception as e:
        logging.error(f"Error loading team detail {team_id}: {e}")
        return render_template(
            'error.html',
            error_code=500,
            error_message="Fehler beim Laden der Team-Details"
        ), 500

def get_teams_data(game_filter='', search_query=''):
    """Get teams data from database with optional filtering"""
    try:
        db = get_db()
        
        # Build query
        query = 'SELECT * FROM team_areas WHERE is_active = 1'
        params = []
        
        if game_filter:
            query += ' AND UPPER(game) = UPPER(?)'
            params.append(game_filter)
        
        if search_query:
            query += ' AND (LOWER(team_name) LIKE LOWER(?) OR LOWER(game) LIKE LOWER(?))'
            search_param = f'%{search_query}%'
            params.extend([search_param, search_param])
        
        query += ' ORDER BY game, team_name'
        
        teams = db.execute(query, params).fetchall()
        
        # Group teams by game
        teams_by_game = {}
        total_teams = 0
        
        for team in teams:
            game = team['game']
            if game not in teams_by_game:
                teams_by_game[game] = {
                    'name': game,
                    'teams': [],
                    'count': 0
                }
            
            team_dict = dict(team)
            # Add additional team info if needed
            team_dict['member_count'] = get_team_member_count(team['id'])
            
            teams_by_game[game]['teams'].append(team_dict)
            teams_by_game[game]['count'] += 1
            total_teams += 1
        
        return {
            'teams_by_game': teams_by_game,
            'total_teams': total_teams,
            'total_games': len(teams_by_game)
        }
        
    except Exception as e:
        logging.error(f"Error getting teams data: {e}")
        return {
            'teams_by_game': {},
            'total_teams': 0,
            'total_games': 0
        }

def get_available_games():
    """Get list of available games"""
    try:
        db = get_db()
        games = db.execute('''
            SELECT DISTINCT game 
            FROM team_areas 
            WHERE is_active = 1 
            ORDER BY game
        ''').fetchall()
        
        return [game['game'] for game in games]
        
    except Exception as e:
        logging.error(f"Error getting available games: {e}")
        return []

def get_team_member_count(team_id):
    """Get number of team members (placeholder - would need role/member tracking)"""
    # This would typically query Discord roles or a members table
    # For now, return a placeholder
    return 0

def get_team_members(team_id):
    """Get team members (placeholder)"""
    # This would typically get members from Discord API or member tracking table
    return []

def get_team_stats(team_id):
    """Get team statistics (placeholder)"""
    # This could include match records, activity stats, etc.
    return {
        'matches_played': 0,
        'wins': 0,
        'losses': 0,
        'last_activity': None
    }