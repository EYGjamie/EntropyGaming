from database.db_manager import get_db
import logging
from datetime import datetime

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
        
        sql = 'SELECT * FROM team_areas WHERE is_active = "1"'
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
        """Get team members using the team_members junction table"""
        db = get_db()
        
        try:
            sql = '''
                SELECT 
                    u.id,
                    u.discord_id, 
                    u.username, 
                    u.display_name, 
                    u.nickname, 
                    u.avatar_url,
                    tm.joined_at,
                    tm.role,
                    COALESCE(u.display_name, u.nickname, u.username) as effective_name
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ?
                AND u.is_bot = 0
                ORDER BY tm.joined_at ASC
            '''
            
            members = db.execute(sql, (self.id,)).fetchall()
            return [dict(member) for member in members]
            
        except Exception as e:
            logging.error(f"Error fetching team members for team {self.id}: {e}")
            return []
    
    @classmethod
    def get_available_games(cls):
        """Get all available games"""
        db = get_db()
        
        try:
            games = db.execute('''
                SELECT DISTINCT game 
                FROM team_areas 
                WHERE is_active = "1" 
                ORDER BY game
            ''').fetchall()
            
            return [game['game'] for game in games]
            
        except Exception as e:
            logging.error(f"Error fetching available games: {e}")
            return []
    
    @classmethod
    def get_teams_by_game(cls):
        """Get teams grouped by game with member counts"""
        db = get_db()
        
        try:
            rows = db.execute('''
                SELECT 
                    t.*,
                    COUNT(tm.user_id) as member_count
                FROM team_areas t
                LEFT JOIN team_members tm ON t.id = tm.team_id
                LEFT JOIN users u ON tm.user_id = u.id AND u.is_bot = 0
                WHERE t.is_active = "1"
                GROUP BY t.id
                ORDER BY t.game, t.team_name
            ''').fetchall()
            
            teams_by_game = {}
            for row in rows:
                game = row['game']
                if game not in teams_by_game:
                    teams_by_game[game] = []
                
                team = cls(**{k: v for k, v in dict(row).items() if k != 'member_count'})
                team.member_count = row['member_count']
                teams_by_game[game].append(team)
            
            return teams_by_game
            
        except Exception as e:
            logging.error(f"Error fetching teams by game: {e}")
            return {}
    
    @classmethod
    def search_teams_with_members(cls, search_query):
        """Search teams and their members"""
        db = get_db()
        
        try:
            sql = '''
                SELECT DISTINCT t.*
                FROM team_areas t
                LEFT JOIN team_members tm ON t.id = tm.team_id
                LEFT JOIN users u ON tm.user_id = u.id
                WHERE t.is_active = "1"
                AND (
                    t.team_name LIKE ? 
                    OR t.game LIKE ?
                    OR u.username LIKE ?
                    OR u.display_name LIKE ?
                    OR u.nickname LIKE ?
                )
                ORDER BY t.game, t.team_name
            '''
            
            search_pattern = f'%{search_query}%'
            params = [search_pattern] * 5
            
            rows = db.execute(sql, params).fetchall()
            teams = []
            
            for row in rows:
                team = cls(**dict(row))
                team.members = team._get_members()
                teams.append(team)
            
            return teams
            
        except Exception as e:
            logging.error(f"Error searching teams with members: {e}")
            return []

    
    def update_member_role(self, user_id, new_role):
        """Update a member's role in the team"""
        db = get_db()
        
        try:
            result = db.execute('''
                UPDATE team_members 
                SET role = ?
                WHERE team_id = ? AND user_id = ?
            ''', (new_role, self.id, user_id))
            
            db.commit()
            
            self.members = self._get_members()
            return result.rowcount > 0
            
        except Exception as e:
            logging.error(f"Error updating role for member {user_id} in team {self.id}: {e}")
            return False
    
    def is_member(self, user_id):
        """Check if a user is a member of this team"""
        db = get_db()
        
        try:
            result = db.execute('''
                SELECT 1 FROM team_members 
                WHERE team_id = ? AND user_id = ?
            ''', (self.id, user_id)).fetchone()
            
            return result is not None
            
        except Exception as e:
            logging.error(f"Error checking membership for user {user_id} in team {self.id}: {e}")
            return False
    
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
            'members': self.members,
            'member_count': len(self.members)
        }