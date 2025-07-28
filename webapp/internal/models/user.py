from database.db_manager import get_db
from datetime import datetime
import logging

class User:
    def __init__(self, id, discord_id, username, display_name, nickname, avatar_url, 
                 is_bot, joined_server_at, first_seen, last_seen, 
                 role_diamond_club, role_diamond_teams, role_entropy_member,
                 role_management, role_developer, role_head_management, role_projektleitung):
        self.id = id
        self.discord_id = discord_id
        self.username = username
        self.display_name = display_name
        self.nickname = nickname
        self.avatar_url = avatar_url
        self.is_bot = is_bot
        self.joined_server_at = joined_server_at
        self.first_seen = first_seen
        self.last_seen = last_seen
        
        # Rollen
        self.role_diamond_club = role_diamond_club
        self.role_diamond_teams = role_diamond_teams
        self.role_entropy_member = role_entropy_member
        self.role_management = role_management
        self.role_developer = role_developer
        self.role_head_management = role_head_management
        self.role_projektleitung = role_projektleitung

    @classmethod
    def get_by_discord_id(cls, discord_id):
        """Get user by Discord ID"""
        try:
            db = get_db()
            row = db.execute(
                '''SELECT * FROM users WHERE discord_id = ?''',
                (str(discord_id),)
            ).fetchone()
            
            if row:
                return cls(**dict(row))
            return None
            
        except Exception as e:
            logging.error(f"Error getting user by Discord ID {discord_id}: {e}")
            return None

    @classmethod
    def get_by_id(cls, user_id):
        """Get user by internal ID"""
        try:
            db = get_db()
            row = db.execute(
                '''SELECT * FROM users WHERE id = ?''',
                (user_id,)
            ).fetchone()
            
            if row:
                return cls(**dict(row))
            return None
            
        except Exception as e:
            logging.error(f"Error getting user by ID {user_id}: {e}")
            return None

    @classmethod
    def create_or_update_from_discord(cls, discord_user_data, guild_member_data=None):
        """Create or update user from Discord API data"""
        try:
            db = get_db()
            
            # Extract Discord user info
            discord_id = str(discord_user_data['id'])
            username = discord_user_data['username']
            display_name = discord_user_data.get('global_name', username)
            avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_user_data['avatar']}.png" if discord_user_data.get('avatar') else None
            
            # Guild member info
            nickname = None
            joined_server_at = None
            if guild_member_data:
                nickname = guild_member_data.get('nick')
                joined_server_at = guild_member_data.get('joined_at')
            
            # Check if user exists
            existing_user = cls.get_by_discord_id(discord_id)
            
            if existing_user:
                # Update existing user
                db.execute('''
                    UPDATE users 
                    SET username = ?, display_name = ?, nickname = ?, avatar_url = ?, 
                        last_seen = CURRENT_TIMESTAMP
                    WHERE discord_id = ?
                ''', (username, display_name, nickname, avatar_url, discord_id))
                
                db.commit()
                return cls.get_by_discord_id(discord_id)
            else:
                # Create new user
                cursor = db.execute('''
                    INSERT INTO users 
                    (discord_id, username, display_name, nickname, avatar_url, is_bot, 
                     joined_server_at, first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ''', (discord_id, username, display_name, nickname, avatar_url, False, joined_server_at))
                
                db.commit()
                return cls.get_by_id(cursor.lastrowid)
                
        except Exception as e:
            logging.error(f"Error creating/updating user from Discord: {e}")
            return None

    @classmethod
    def get_management_users(cls):
        """Get all users with management roles"""
        try:
            db = get_db()
            rows = db.execute('''
                SELECT * FROM users 
                WHERE role_management = 1 
                OR role_head_management = 1 
                OR role_developer = 1
                ORDER BY 
                    role_head_management DESC,
                    role_management DESC,
                    role_developer DESC,
                    username ASC
            ''').fetchall()
            
            return [cls(**dict(row)) for row in rows]
            
        except Exception as e:
            logging.error(f"Error getting management users: {e}")
            return []

    def update_last_seen(self):
        """Update last seen timestamp"""
        try:
            db = get_db()
            db.execute(
                'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                (self.id,)
            )
            db.commit()
            
        except Exception as e:
            logging.error(f"Error updating last seen for user {self.id}: {e}")

    def get_roles(self):
        """Get list of roles for this user"""
        roles = []
        
        if self.role_projektleitung:
            roles.append('Projektleitung')
        if self.role_head_management:
            roles.append('Head Management')
        if self.role_management:
            roles.append('Management')
        if self.role_developer:
            roles.append('Developer')
        if self.role_diamond_club:
            roles.append('Diamond Club')
        if self.role_diamond_teams:
            roles.append('Diamond Teams')
        if self.role_entropy_member:
            roles.append('Entropy Member')
            
        return roles

    def has_role(self, *roles):
        """Check if user has any of the specified roles"""
        user_roles = self.get_roles()
        return any(role in user_roles for role in roles)

    def has_management_role(self):
        """Check if user has any management role"""
        return self.role_management or self.role_head_management or self.role_developer

    def update_roles_from_discord(self, guild_roles):
        """Update user roles based on Discord guild roles"""
        try:
            db = get_db()
            
            # Map Discord role names to database columns
            role_mapping = {
                'Diamond Club': 'role_diamond_club',
                'Diamond Teams': 'role_diamond_teams', 
                'Entropy Member': 'role_entropy_member',
                'Management': 'role_management',
                'Developer': 'role_developer',
                'Head Management': 'role_head_management',
                'Projektleitung': 'role_projektleitung'
            }
            
            # Reset all roles first
            update_data = {col: False for col in role_mapping.values()}
            
            # Set roles based on Discord roles
            for role_name in guild_roles:
                if role_name in role_mapping:
                    update_data[role_mapping[role_name]] = True
            
            # Build UPDATE query
            set_clause = ', '.join([f"{col} = ?" for col in update_data.keys()])
            values = list(update_data.values()) + [self.id]
            
            db.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
            db.commit()
            
            logging.info(f"Updated roles for user {self.discord_id}: {guild_roles}")
            
        except Exception as e:
            logging.error(f"Error updating roles for user {self.id}: {e}")

    def update_profile(self, full_name=None, phone=None, description=None):
        try:
            db = get_db()
            
            # Build update data
            update_data = {}
            if full_name is not None:
                update_data['full_name'] = full_name
            if phone is not None:
                update_data['phone'] = phone  
            if description is not None:
                update_data['description'] = description
            
            if not update_data:
                return True
            
            # Build UPDATE query
            set_clause = ', '.join([f"{col} = ?" for col in update_data.keys()])
            values = list(update_data.values()) + [self.id]
            
            db.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
            db.commit()
            
            # Update instance attributes
            for key, value in update_data.items():
                setattr(self, key, value)
        
            
            logging.info(f"Updated profile for user {self.discord_id}")
            return True
            
        except Exception as e:
            logging.error(f"Error updating profile for user {self.id}: {e}")
            return False

    def get_profile_image_url(self):
        """Get profile image URL - prioritize Discord avatar"""
        if self.avatar_url:
            # Discord avatar URLs können verschiedene Größen haben
            # Wir können ?size=128 anhängen für optimale Größe
            if '?' in self.avatar_url:
                return self.avatar_url
            else:
                return f"{self.avatar_url}?size=128"
        else:
            # Fallback auf Default Avatar oder Initialen
            return None
        
    def can_view_profile(self, target_user_id):
        """Check if user can view another user's profile"""
        # Users can always view their own profile
        if self.id == target_user_id:
            return True
        
        # Management users can view other profiles
        if self.has_management_role():
            return True
        
        return False

    def get_highest_role(self):
        """Get the highest priority role for this user"""
        role_hierarchy = [
            ('role_projektleitung', 'Projektleitung'),
            ('role_head_management', 'Head Management'),
            ('role_developer', 'Developer'),
            ('role_management', 'Management'),
            ('role_entropy_member', 'Entropy Member'),
            ('role_diamond_teams', 'Diamond Teams'),
            ('role_diamond_club', 'Diamond Club'),


        ]
        
        for role_attr, role_name in role_hierarchy:
            if getattr(self, role_attr, False):
                return role_name
        
        return None


    @property
    def display_name_or_username(self):
        """Get display name or fallback to username"""
        return self.display_name or self.username

    @property
    def effective_name(self):
        """Get effective name (nickname > display_name > username)"""
        return self.nickname or self.display_name or self.username
    
    @property
    def profile_url(self):
        """Get public profile URL for this user"""
        from flask import url_for
        return url_for('profile.view_profile', user_id=self.id, _external=True)

    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'discord_id': self.discord_id,
            'username': self.username,
            'display_name': self.display_name,
            'nickname': self.nickname,
            'avatar_url': self.avatar_url,
            'effective_name': self.effective_name,
            'roles': self.get_roles(),
            'is_management': self.has_management_role(),
            'last_seen': self.last_seen
        }
    
    def to_public_dict(self):
        """Convert user to dictionary for public view (limited info)"""
        return {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'nickname': self.nickname,
            'effective_name': self.effective_name,
            'avatar_url': self.get_profile_image_url(),
            'highest_role': self.get_highest_role(),
            'roles': self.get_roles(),
            'joined_server_at': self.joined_server_at,
            'last_seen': self.last_seen,
            'is_management': self.has_management_role()
        }

    def to_management_dict(self):
        """Convert user to dictionary for management view (with contact info)"""
        data = self.to_public_dict()
        data.update({
            'email': getattr(self, 'email', None),
            'phone': getattr(self, 'phone', None),
            'description': getattr(self, 'description', None),
            'discord_id': self.discord_id,
            'first_seen': self.first_seen
        })
        return data