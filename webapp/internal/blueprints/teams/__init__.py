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
        teams = Team.get_all(game_filter=game_filter, search_query=search_query)
        
        # Group teams by game
        teams_by_game = {}
        for team in teams:
            if team.game not in teams_by_game:
                teams_by_game[team.game] = []
            teams_by_game[team.game].append(team)
        
        # Get available games for filter
        available_games = Team.get_available_games()
        
        # Calculate statistics
        total_teams = len(teams)
        total_members = sum(len(team.members) for team in teams)
        
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
            teams_by_game=teams_by_game,
            available_games=available_games,
            current_game_filter=game_filter,
            current_search=search_query,
            total_teams=total_teams,
            total_members=total_members
        )
        
    except Exception as e:
        logging.error(f"Error loading teams page: {e}")
        return render_template(
            'teams/index.html',
            user=g.user,
            roles=g.user_roles,
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
            return render_template(
                'errors/404.html',
                error_message="Team nicht gefunden"
            ), 404
        
        return render_template(
            'teams/detail.html',
            user=g.user,
            roles=g.user_roles,
            team=team
        )
        
    except Exception as e:
        logging.error(f"Error loading team {team_id}: {e}")
        return render_template(
            'errors/500.html',
            error_message="Fehler beim Laden des Teams"
        ), 500

@teams_bp.route('/api/teams')
@login_required
def api_teams():
    """API endpoint for teams data"""
    try:
        game_filter = request.args.get('game', '')
        search_query = request.args.get('search', '')
        
        teams = Team.get_all(game_filter=game_filter, search_query=search_query)
        
        return jsonify({
            'success': True,
            'data': [team.to_dict() for team in teams]
        })
        
    except Exception as e:
        logging.error(f"Error in teams API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Teams'
        }), 500

@teams_bp.route('/api/games')
@login_required
def api_games():
    """API endpoint for available games"""
    try:
        games = Team.get_available_games()
        
        return jsonify({
            'success': True,
            'data': games
        })
        
    except Exception as e:
        logging.error(f"Error in games API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Spiele'
        }), 500