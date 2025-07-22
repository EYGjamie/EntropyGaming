import bcrypt
from datetime import datetime
from database.db_manager import get_db

class User:
    """User model for authentication and user management"""
    
    def __init__(self, id=None, username=None, email=None, full_name=None, 
                 phone=None, description=None, profile_image=None, 
                 is_active=True, last_login=None, created_at=None, updated_at=None):
        self.id = id
        self.username = username
        self.email = email
        self.full_name = full_name
        self.phone = phone
        self.description = description
        self.profile_image = profile_image or 'default-avatar.png'
        self.is_active = is_active
        self.last_login = last_login
        self.created_at = created_at
        self.updated_at = updated_at
        self._roles = None
    
    @classmethod
    def get_by_id(cls, user_id):
        """Get user by ID"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM web_users WHERE id = ? AND is_active = TRUE',
            (user_id,)
        ).fetchone()
        
        if row:
            return cls.from_db_row(row)
        return None
    
    @classmethod
    def get_by_username_or_email(cls, identifier):
        """Get user by username or email"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM web_users WHERE (username = ? OR email = ?) AND is_active = TRUE',
            (identifier, identifier)
        ).fetchone()
        
        if row:
            return cls.from_db_row(row)
        return None
    
    @classmethod
    def get_all(cls, include_inactive=False):
        """Get all users"""
        db = get_db()
        query = 'SELECT * FROM web_users'
        if not include_inactive:
            query += ' WHERE is_active = TRUE'
        query += ' ORDER BY created_at DESC'
        
        rows = db.execute(query).fetchall()
        return [cls.from_db_row(row) for row in rows]
    
    @classmethod
    def from_db_row(cls, row):
        """Create User instance from database row"""
        return cls(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            full_name=row['full_name'],
            phone=row['phone'],
            description=row['description'],
            profile_image=row['profile_image'],
            is_active=bool(row['is_active']),
            last_login=row['last_login'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def verify_password(self, password):
        """Verify password against stored hash"""
        db = get_db()
        row = db.execute(
            'SELECT password_hash FROM web_users WHERE id = ?',
            (self.id,)
        ).fetchone()
        
        if row:
            return bcrypt.checkpw(password.encode('utf-8'), row['password_hash'])
        return False
    
    def update_last_login(self):
        """Update last login timestamp"""
        db = get_db()
        db.execute(
            'UPDATE web_users SET last_login = ? WHERE id = ?',
            (datetime.now(), self.id)
        )
        db.commit()
        self.last_login = datetime.now()
    
    def get_roles(self):
        """Get user roles"""
        if self._roles is None:
            db = get_db()
            rows = db.execute(
                'SELECT role FROM web_user_roles WHERE user_id = ?',
                (self.id,)
            ).fetchall()
            self._roles = [row['role'] for row in rows]
        return self._roles
    
    def has_role(self, role):
        """Check if user has specific role"""
        return role in self.get_roles()
    
    def has_any_role(self, *roles):
        """Check if user has any of the specified roles"""
        user_roles = self.get_roles()
        return any(role in user_roles for role in roles)
    
    def add_role(self, role, assigned_by=None):
        """Add role to user"""
        db = get_db()
        try:
            db.execute(
                'INSERT INTO web_user_roles (user_id, role, assigned_by) VALUES (?, ?, ?)',
                (self.id, role, assigned_by)
            )
            db.commit()
            self._roles = None  # Reset cached roles
            return True
        except:
            return False
    
    def remove_role(self, role):
        """Remove role from user"""
        db = get_db()
        db.execute(
            'DELETE FROM web_user_roles WHERE user_id = ? AND role = ?',
            (self.id, role)
        )
        db.commit()
        self._roles = None  # Reset cached roles
    
    def save(self):
        """Save user to database"""
        db = get_db()
        
        if self.id:
            # Update existing user
            db.execute('''
                UPDATE web_users 
                SET username = ?, email = ?, full_name = ?, phone = ?, 
                    description = ?, profile_image = ?, is_active = ?, updated_at = ?
                WHERE id = ?
            ''', (
                self.username, self.email, self.full_name, self.phone,
                self.description, self.profile_image, self.is_active,
                datetime.now(), self.id
            ))
        else:
            # Create new user
            cursor = db.execute('''
                INSERT INTO web_users (username, email, full_name, phone, description, 
                                     profile_image, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                self.username, self.email, self.full_name, self.phone,
                self.description, self.profile_image, self.is_active,
                datetime.now(), datetime.now()
            ))
            self.id = cursor.lastrowid
        
        db.commit()
        return self
    
    def set_password(self, password):
        """Set user password"""
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        db = get_db()
        db.execute(
            'UPDATE web_users SET password_hash = ?, updated_at = ? WHERE id = ?',
            (password_hash, datetime.now(), self.id)
        )
        db.commit()
    
    def to_dict(self):
        """Convert user to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'description': self.description,
            'profile_image': self.profile_image,
            'is_active': self.is_active,
            'roles': self.get_roles(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at
        }
    
    def __repr__(self):
        return f'<User {self.username}>'