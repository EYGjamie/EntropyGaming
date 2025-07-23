import requests
import logging
from flask import current_app, session

class DiscordAPI:
    BASE_URL = "https://discord.com/api/v10"
    
    @staticmethod
    def get_user_info(access_token):
        """Get Discord user information"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{DiscordAPI.BASE_URL}/users/@me", headers=headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logging.error(f"Error getting Discord user info: {e}")
            return None

    @staticmethod
    def get_guild_member(user_id, guild_id, bot_token):
        """Get guild member information using bot token"""
        try:
            headers = {
                'Authorization': f'Bot {bot_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{DiscordAPI.BASE_URL}/guilds/{guild_id}/members/{user_id}",
                headers=headers
            )
            
            if response.status_code == 404:
                # User not in guild
                return None
                
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logging.error(f"Error getting Discord guild member: {e}")
            return None

    @staticmethod
    def get_guild_roles(guild_id, bot_token):
        """Get all guild roles"""
        try:
            headers = {
                'Authorization': f'Bot {bot_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{DiscordAPI.BASE_URL}/guilds/{guild_id}/roles",
                headers=headers
            )
            response.raise_for_status()
            
            return {role['id']: role['name'] for role in response.json()}
            
        except requests.RequestException as e:
            logging.error(f"Error getting Discord guild roles: {e}")
            return {}

    @staticmethod
    def check_user_roles(user_id, guild_id, bot_token):
        """Check what roles a user has in the guild"""
        try:
            member_data = DiscordAPI.get_guild_member(user_id, guild_id, bot_token)
            if not member_data:
                return []
            
            user_role_ids = member_data.get('roles', [])
            guild_roles = DiscordAPI.get_guild_roles(guild_id, bot_token)
            
            # Get role names for user's role IDs
            user_role_names = [guild_roles.get(role_id) for role_id in user_role_ids if role_id in guild_roles]
            
            return [name for name in user_role_names if name]
            
        except Exception as e:
            logging.error(f"Error checking user roles: {e}")
            return []

    @staticmethod
    def user_has_required_role(user_id, guild_id, bot_token, required_roles):
        """Check if user has any of the required roles"""
        try:
            user_roles = DiscordAPI.check_user_roles(user_id, guild_id, bot_token)
            
            # Map database role columns to Discord role names
            role_mapping = {
                'role_management': 'Management',
                'role_head_management': 'Head Management',
                'role_developer': 'Developer',
                'role_projektleitung': 'Projektleitung'
            }
            
            # Convert required role keys to Discord role names
            required_role_names = [role_mapping.get(role, role) for role in required_roles]
            
            # Check if user has any required role
            return any(role in user_roles for role in required_role_names)
            
        except Exception as e:
            logging.error(f"Error checking required roles: {e}")
            return False

def get_discord_oauth_url():
    """Generate Discord OAuth URL"""
    client_id = current_app.config['DISCORD_CLIENT_ID']
    redirect_uri = current_app.config['DISCORD_REDIRECT_URI']
    
    oauth_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=identify"
    )
    
    return oauth_url

def exchange_code_for_token(code):
    """Exchange authorization code for access token"""
    try:
        token_url = "https://discord.com/api/oauth2/token"
        
        data = {
            'client_id': current_app.config['DISCORD_CLIENT_ID'],
            'client_secret': current_app.config['DISCORD_CLIENT_SECRET'],
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': current_app.config['DISCORD_REDIRECT_URI']
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        response = requests.post(token_url, data=data, headers=headers)
        response.raise_for_status()
        
        return response.json()
        
    except requests.RequestException as e:
        logging.error(f"Error exchanging code for token: {e}")
        return None