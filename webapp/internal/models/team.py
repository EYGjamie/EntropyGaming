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
    
    def _get_members(self, include_stats=True):
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
                    u.last_seen,
                    tm.joined_at,
                    u.role_diamond_club,
                    u.role_diamond_teams,
                    u.role_entropy_member,
                    u.role_management,
                    u.role_developer,
                    u.role_head_management,
                    u.role_projektleitung
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ? 
                AND u.is_bot = 0
                ORDER BY tm.joined_at ASC, u.display_name
            '''
            
            members = db.execute(sql, (self.id,)).fetchall()
            
            result = []
            for member in members:
                member_dict = dict(member)
                
                # Bestimme den besten Anzeigenamen
                display_name = (
                    member_dict.get('nickname') or 
                    member_dict.get('display_name') or 
                    member_dict.get('username')
                )
                member_dict['effective_name'] = display_name
                
                # Füge zusätzliche Informationen hinzu wenn gewünscht
                if include_stats:
                    member_dict['is_recently_active'] = self._is_user_recently_active(member_dict['last_seen'])
                    member_dict['has_management_role'] = any([
                        member_dict.get('role_management'),
                        member_dict.get('role_head_management'),
                        member_dict.get('role_projektleitung')
                    ])
                
                result.append(member_dict)
            
            return result
            
        except Exception as e:
            logging.error(f"Error fetching team members for team {self.id}: {e}")
            return []
    
    def get_member_count(self):
        """Get total number of team members"""
        db = get_db()
        
        try:
            result = db.execute('''
                SELECT COUNT(*) as count 
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ? AND u.is_bot = 0
            ''', (self.id,)).fetchone()
            
            return result['count'] if result else 0
            
        except Exception as e:
            logging.error(f"Error getting member count for team {self.id}: {e}")
            return 0
    
    def get_active_members_count(self, days=30):
        """Get count of recently active team members"""
        db = get_db()
        
        try:
            cutoff_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            result = db.execute('''
                SELECT COUNT(*) as count 
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ? 
                AND u.is_bot = 0
                AND datetime(u.last_seen) > datetime(?, '-{} days')
            '''.format(days), (self.id, cutoff_date)).fetchone()
            
            return result['count'] if result else 0
            
        except Exception as e:
            logging.error(f"Error getting active member count for team {self.id}: {e}")
            return 0
    
    def get_members_with_role(self, role_name):
        """Get team members with a specific role"""
        db = get_db()
        
        try:
            sql = f'''
                SELECT 
                    u.id,
                    u.discord_id, 
                    u.username, 
                    u.display_name, 
                    u.nickname, 
                    u.avatar_url,
                    tm.joined_at
                FROM team_members tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.team_id = ? 
                AND u.is_bot = 0
                AND u.role_{role_name} = 1
                ORDER BY tm.joined_at ASC
            '''
            
            members = db.execute(sql, (self.id,)).fetchall()
            return [dict(member) for member in members]
            
        except Exception as e:
            logging.error(f"Error fetching team members with role {role_name} for team {self.id}: {e}")
            return []
    
    def add_member(self, user_id):
        """Add a user to the team"""
        db = get_db()
        
        try:
            db.execute('''
                INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at)
                VALUES (?, ?, ?)
            ''', (self.id, user_id, datetime.now()))
            db.commit()
            
            # Refresh members list
            self.members = self._get_members()
            return True
            
        except Exception as e:
            logging.error(f"Error adding member {user_id} to team {self.id}: {e}")
            return False
    
    def remove_member(self, user_id):
        """Remove a user from the team"""
        db = get_db()
        
        try:
            result = db.execute('''
                DELETE FROM team_members 
                WHERE team_id = ? AND user_id = ?
            ''', (self.id, user_id))
            
            db.commit()
            
            # Refresh members list
            self.members = self._get_members()
            return result.rowcount > 0
            
        except Exception as e:
            logging.error(f"Error removing member {user_id} from team {self.id}: {e}")
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
    
    def get_member_join_date(self, user_id):
        """Get the date when a user joined the team"""
        db = get_db()
        
        try:
            result = db.execute('''
                SELECT joined_at FROM team_members 
                WHERE team_id = ? AND user_id = ?
            ''', (self.id, user_id)).fetchone()
            
            return result['joined_at'] if result else None
            
        except Exception as e:
            logging.error(f"Error getting join date for user {user_id} in team {self.id}: {e}")
            return None
    
    @staticmethod
    def _is_user_recently_active(last_seen, days=7):
        """Check if user was active in the last X days"""
        if not last_seen:
            return False
        
        try:
            if isinstance(last_seen, str):
                last_seen_dt = datetime.fromisoformat(last_seen)
            else:
                last_seen_dt = last_seen
            
            days_since_last_seen = (datetime.now() - last_seen_dt).days
            return days_since_last_seen <= days
            
        except Exception:
            return False
    
    @classmethod
    def get_available_games(cls):
        """Get list of available games"""
        db = get_db()
        
        try:
            rows = db.execute(
                'SELECT DISTINCT game FROM team_areas WHERE is_active = "1" ORDER BY game'
            ).fetchall()
            
            return [row['game'] for row in rows]
            
        except Exception as e:
            logging.error(f"Error fetching available games: {e}")
            return []
    
    @classmethod
    def get_teams_by_game(cls):
        """Get teams grouped by game"""
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