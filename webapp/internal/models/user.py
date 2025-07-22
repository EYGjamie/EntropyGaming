import bcrypt
from datetime import datetime
from database.db_manager import get_db, log_activity
import logging

class User:
    def __init__(self, id, username, email, password_hash, full_name=None, 
                 phone=None, description=None, profile_image='default-avatar.png',
                 discord_id=None, is_active=True, last_login=None, 
                 created_at=None, updated_at=None):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.full_name = full_name
        self.phone = phone
        self.description = description
        self.profile_image = profile_image
        self.discord_id = discord_id
        self.is_active = is_active
        self.last_login = last_login
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def get_by_id(cls, user_id):
        """Get user by ID"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM web_users WHERE id = ? AND is_active = 1',
            (user_id,)
        ).fetchone()
        
        if row:
            return cls(**dict(row))
        return None
    
    @classmethod
    def get_by_username_or_email(cls, username_or_email):
        """Get user by username or email"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM web_users WHERE (username = ? OR email = ?) AND is_active = 1',
            (username_or_email, username_or_email)
        ).fetchone()
        
        if row:
            return cls(**dict(row))
        return None
    
    def verify_password(self, password):
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception as e:
            logging.error(f"Password verification error: {e}")
            return False
    
    def get_roles(self):
        """Get user roles"""
        db = get_db()
        rows = db.execute(
            'SELECT role FROM web_user_roles WHERE user_id = ?',
            (self.id,)
        ).fetchall()
        
        return [row['role'] for row in rows]
    
    def has_role(self, *roles):
        """Check if user has any of the specified roles"""
        user_roles = self.get_roles()
        return any(role in user_roles for role in roles)
    
    def update_last_login(self):
        """Update last login timestamp"""
        db = get_db()
        db.execute(
            'UPDATE web_users SET last_login = ? WHERE id = ?',
            (datetime.now(), self.id)
        )
        db.commit()
        self.last_login = datetime.now()
    
    def update_profile(self, full_name=None, phone=None, description=None, profile_image=None):
        """Update user profile"""
        db = get_db()
        
        updates = []
        params = []
        
        if full_name is not None:
            updates.append('full_name = ?')
            params.append(full_name)
            self.full_name = full_name
        
        if phone is not None:
            updates.append('phone = ?')
            params.append(phone)
            self.phone = phone
        
        if description is not None:
            updates.append('description = ?')
            params.append(description)
            self.description = description
        
        if profile_image is not None:
            updates.append('profile_image = ?')
            params.append(profile_image)
            self.profile_image = profile_image
        
        if updates:
            updates.append('updated_at = ?')
            params.append(datetime.now())
            params.append(self.id)
            
            sql = f"UPDATE web_users SET {', '.join(updates)} WHERE id = ?"
            db.execute(sql, params)
            db.commit()
            
            log_activity(
                user_id=self.id,
                action='profile_update',
                details=f"Updated: {', '.join(updates)}"
            )
    
    def add_role(self, role, assigned_by=None):
        """Add role to user"""
        db = get_db()
        try:
            db.execute(
                'INSERT INTO web_user_roles (user_id, role, assigned_by) VALUES (?, ?, ?)',
                (self.id, role, assigned_by)
            )
            db.commit()
            
            log_activity(
                user_id=assigned_by or self.id,
                action='role_assigned',
                resource_type='user',
                resource_id=str(self.id),
                details=f"Role '{role}' assigned to {self.username}"
            )
            
        except Exception as e:
            logging.error(f"Error adding role {role} to user {self.id}: {e}")
            raise
    
    def remove_role(self, role, removed_by=None):
        """Remove role from user"""
        db = get_db()
        try:
            db.execute(
                'DELETE FROM web_user_roles WHERE user_id = ? AND role = ?',
                (self.id, role)
            )
            db.commit()
            
            log_activity(
                user_id=removed_by or self.id,
                action='role_removed',
                resource_type='user',
                resource_id=str(self.id),
                details=f"Role '{role}' removed from {self.username}"
            )
            
        except Exception as e:
            logging.error(f"Error removing role {role} from user {self.id}: {e}")
            raise
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'description': self.description,
            'profile_image': self.profile_image,
            'discord_id': self.discord_id,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'roles': self.get_roles()
        }