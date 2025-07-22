from database.db_manager import get_db
import logging

class Team:
    def __init__(self, id=None, team_name=None, game=None, role_id=None,
                 category_id=None, voicechannel_id=None, is_active=True):
        self.id = id
        self.team_name = team_name
        self.game = game
        self.role_id = role_id
        self.category_id = category_id
        self.voicechannel_id = voicechannel_id
        self.is_active = is_active
        self.members = []
    
    @classmethod
    def get_all(cls, game_filter=None, search_query=None):
        """Get all teams with optional filtering"""
        db = get_db()
        
        sql = 'SELECT * FROM team_areas WHERE is_active = "true"'
        params = []
        
        if game_filter:
            sql += ' AND game = ?'
            params.append(game_filter)
        
        if search_query:
            sql += ' AND team_name LIKE ?'
            params.append(f'%{search_query}%')
        
        sql += ' ORDER BY game, team_name'
        
        try:
            rows = db.execute(sql, params).fetchall()
            teams = []
            
            for row in rows:
                team = cls(**dict(row))
                team.members = team._get_members()
                teams.append(team)
                
            return teams
            
        except Exception as e:
            logging.error(f"Error fetching teams: {e}")
            return []
    
    @classmethod
    def get_by_id(cls, team_id):
        """Get team by ID"""
        db = get_db()
        
        try:
            row = db.execute(
                'SELECT * FROM team_areas WHERE id = ?',
                (team_id,)
            ).fetchone()
            
            if row:
                team = cls(**dict(row))
                team.members = team._get_members()
                return team
                
        except Exception as e:
            logging.error(f"Error fetching team {team_id}: {e}")
        
        return None
    
    def _get_members(self):
        """Get team members from Discord bot database"""
        db = get_db()
        
        try:
            # This assumes the Discord bot stores role membership information
            # Adjust the query based on your actual database structure
            members = db.execute('''
                SELECT u.discord_id, u.username, u.display_name, u.nickname, u.avatar_url
                FROM users u
                WHERE u.role_diamond_teams = 1
                AND u.is_bot = 0
                ORDER BY u.display_name
            ''').fetchall()
            
            # Filter members based on the team's role_id if needed
            # This is simplified - you might need more complex logic
            # to determine which users belong to which team
            
            return [dict(member) for member in members]
            
        except Exception as e:
            logging.error(f"Error fetching team members for team {self.id}: {e}")
            return []
    
    @classmethod
    def get_available_games(cls):
        """Get list of available games"""
        db = get_db()
        
        try:
            rows = db.execute(
                'SELECT DISTINCT game FROM team_areas WHERE is_active = "true" ORDER BY game'
            ).fetchall()
            
            return [row['game'] for row in rows]
            
        except Exception as e:
            logging.error(f"Error fetching available games: {e}")
            return []
    
    def to_dict(self):
        """Convert team to dictionary"""
        return {
            'id': self.id,
            'team_name': self.team_name,
            'game': self.game,
            'role_id': self.role_id,
            'category_id': self.category_id,
            'voicechannel_id': self.voicechannel_id,
            'is_active': self.is_active,
            'members': self.members
        }