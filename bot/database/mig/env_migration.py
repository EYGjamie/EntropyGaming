#!/usr/bin/env python3
"""
Script to import environment variables from .env files into bot_const_ids table
Filepath: ./scripts/import_env_to_db.py
"""

import sqlite3
import os
import re
from datetime import datetime
from typing import Dict, Optional

class EnvToDatabaseImporter:
    def __init__(self, db_path: str):
        """
        Initialize the importer with database path
        
        Args:
            db_path (str): Path to the SQLite database file
        """
        self.db_path = db_path
        self.prod_values = {}
        self.test_values = {}
        
    def parse_env_file(self, file_path: str) -> Dict[str, str]:
        """
        Parse .env file and return key-value pairs
        
        Args:
            file_path (str): Path to the .env file
            
        Returns:
            Dict[str, str]: Dictionary with environment variables
        """
        env_vars = {}
        
        if not os.path.exists(file_path):
            print(f"Warning: File {file_path} not found")
            return env_vars
            
        with open(file_path, 'r', encoding='utf-8') as file:
            for line_num, line in enumerate(file, 1):
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                    
                # Match KEY = VALUE pattern (with optional quotes)
                match = re.match(r'^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$', line)
                if match:
                    key = match.group(1)
                    value = match.group(2).strip()
                    
                    # Remove quotes if present
                    if (value.startswith('"') and value.endswith('"')) or \
                       (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]
                    
                    env_vars[key] = value
                else:
                    print(f"Warning: Could not parse line {line_num} in {file_path}: {line}")
                    
        return env_vars
    
    def determine_category(self, key: str) -> str:
        """
        Determine category based on the key name
        
        Args:
            key (str): Environment variable key
            
        Returns:
            str: Category name
        """
        key_lower = key.lower()
        
        if key_lower.startswith('admin'):
            return 'admin'
        elif 'discord' in key_lower or 'bot' in key_lower or 'guild' in key_lower:
            return 'discord'
        elif 'channel' in key_lower:
            return 'channels'
        elif 'kategory' in key_lower or 'category' in key_lower:
            return 'categories'
        elif 'role' in key_lower:
            return 'roles'
        elif 'ticket' in key_lower:
            return 'tickets'
        elif 'quiz' in key_lower:
            return 'quiz'
        elif 'database' in key_lower:
            return 'database'
        elif 'weekly' in key_lower:
            return 'reports'
        elif 'perm' in key_lower:
            return 'permissions'
        else:
            return 'general'
    
    def generate_description(self, key: str) -> str:
        """
        Generate a description based on the key name
        
        Args:
            key (str): Environment variable key
            
        Returns:
            str: Description
        """
        # Convert underscores to spaces and make it more readable
        description = key.replace('_', ' ').lower()
        
        # Capitalize first letter
        description = description.capitalize()
        
        # Add specific descriptions for known patterns
        if 'id' in key.lower():
            description += ' identifier'
        elif 'token' in key.lower():
            description += ' authentication token'
        elif 'channel' in key.lower():
            description += ' channel configuration'
        elif 'role' in key.lower():
            description += ' role configuration'
        elif 'kategory' in key.lower():
            description += ' category configuration'
            
        return description
    
    def load_env_files(self, prod_file: str, test_file: str):
        """
        Load both environment files
        
        Args:
            prod_file (str): Path to production .env file
            test_file (str): Path to test .env file
        """
        print("Loading environment files...")
        self.prod_values = self.parse_env_file(prod_file)
        self.test_values = self.parse_env_file(test_file)
        
        print(f"Loaded {len(self.prod_values)} variables from {prod_file}")
        print(f"Loaded {len(self.test_values)} variables from {test_file}")
        
        # Get all unique keys
        all_keys = set(self.prod_values.keys()) | set(self.test_values.keys())
        print(f"Total unique keys: {len(all_keys)}")
        
        # Warn about missing keys
        prod_only = set(self.prod_values.keys()) - set(self.test_values.keys())
        test_only = set(self.test_values.keys()) - set(self.prod_values.keys())
        
        if prod_only:
            print(f"Warning: Keys only in prod: {', '.join(sorted(prod_only))}")
        if test_only:
            print(f"Warning: Keys only in test: {', '.join(sorted(test_only))}")
    
    def import_to_database(self):
        """
        Import the loaded environment variables to the database
        """
        if not self.prod_values and not self.test_values:
            print("Error: No environment variables loaded")
            return
            
        # Get all unique keys
        all_keys = set(self.prod_values.keys()) | set(self.test_values.keys())
        
        try:
            # Connect to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if table exists
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='bot_const_ids'
            """)
            
            if not cursor.fetchone():
                print("Error: Table 'bot_const_ids' does not exist in the database")
                return
            
            print(f"Importing {len(all_keys)} environment variables to database...")
            
            inserted = 0
            updated = 0
            
            for key in sorted(all_keys):
                prod_value = self.prod_values.get(key, '')
                test_value = self.test_values.get(key, '')
                category = self.determine_category(key)
                description = self.generate_description(key)
                
                # Check if key already exists
                cursor.execute("SELECT id FROM bot_const_ids WHERE const_key = ?", (key,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing record
                    cursor.execute("""
                        UPDATE bot_const_ids 
                        SET prod_value = ?, test_value = ?, description = ?, category = ?, 
                            updated_at = CURRENT_TIMESTAMP
                        WHERE const_key = ?
                    """, (prod_value, test_value, description, category, key))
                    updated += 1
                    print(f"Updated: {key}")
                else:
                    # Insert new record
                    cursor.execute("""
                        INSERT INTO bot_const_ids 
                        (const_key, prod_value, test_value, description, category, is_active)
                        VALUES (?, ?, ?, ?, ?, true)
                    """, (key, prod_value, test_value, description, category))
                    inserted += 1
                    print(f"Inserted: {key}")
            
            # Commit changes
            conn.commit()
            
            print(f"\nImport completed successfully!")
            print(f"Inserted: {inserted} new records")
            print(f"Updated: {updated} existing records")
            print(f"Total: {inserted + updated} records processed")
            
            # Show summary by category
            cursor.execute("""
                SELECT category, COUNT(*) as count 
                FROM bot_const_ids 
                GROUP BY category 
                ORDER BY category
            """)
            
            print("\nRecords by category:")
            for row in cursor.fetchall():
                print(f"  {row[0]}: {row[1]} records")
                
        except sqlite3.Error as e:
            print(f"Database error: {e}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            if conn:
                conn.close()

def main():
    """
    Main function to run the import process
    """
    # Configuration
    DATABASE_PATH = "db/data/entropy.db"
    PROD_ENV_FILE = "env/.env.main"
    TEST_ENV_FILE = "env/.env.dev"
    
    print("Environment Variables to Database Import Script")
    print("=" * 50)
    
    # Check if database exists
    if not os.path.exists(DATABASE_PATH):
        print(f"Error: Database file not found at {DATABASE_PATH}")
        print("Please ensure the database path is correct.")
        return
    
    # Initialize importer
    importer = EnvToDatabaseImporter(DATABASE_PATH)
    
    # Load environment files
    importer.load_env_files(PROD_ENV_FILE, TEST_ENV_FILE)
    
    # Import to database
    importer.import_to_database()
    
    print("\nImport process completed.")

if __name__ == "__main__":
    main()