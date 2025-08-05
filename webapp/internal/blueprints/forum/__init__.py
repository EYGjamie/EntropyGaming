# webapp/internal/blueprints/forum/__init__.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, g, jsonify, current_app
from werkzeug.utils import secure_filename
from utils.decorators import login_required, role_required
from database.db_manager import get_db, log_activity
import os
import uuid
import logging
import markdown
import requests
from datetime import datetime

forum_bp = Blueprint('forum', __name__, url_prefix='/forum')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'pptx', 'zip', 'rar'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_folder():
    """Ensure upload folder exists"""
    upload_folder = os.path.join(current_app.static_folder, 'uploads', 'forum')
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder

def check_category_permission(category_id, user_roles):
    """Check if user has permission to view/access a category"""
    if not category_id:
        return True
    
    db = get_db()
    category = db.execute('''
        SELECT required_roles FROM forum_categories 
        WHERE id = ?
    ''', (category_id,)).fetchone()
    
    if not category or not category['required_roles']:
        return True
    
    required_roles = category['required_roles'].split(',')
    return any(role.strip() in user_roles for role in required_roles)

def get_accessible_categories(user_roles):
    """Get categories that user has permission to view"""
    db = get_db()
    categories = db.execute('''
        SELECT id, name, description, required_roles,
               (SELECT COUNT(*) FROM forum_posts WHERE category_id = fc.id) as post_count
        FROM forum_categories fc
        ORDER BY name
    ''').fetchall()
    
    accessible_categories = []
    for category in categories:
        if not category['required_roles'] or any(role.strip() in user_roles for role in category['required_roles'].split(',')):
            accessible_categories.append(category)
    
    return accessible_categories

@forum_bp.route('/')
@login_required
def index():
    """Forum dashboard with 2-column layout"""
    try:
        selected_category = request.args.get('category', type=int)
        search_query = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        
        # Get accessible categories for sidebar
        categories = get_accessible_categories(g.user_roles)
        
        # Get posts for selected category or all accessible
        posts_data = get_forum_posts(
            search_query=search_query,
            category_filter=selected_category,
            page=page,
            user_id=g.user.id,
            user_roles=g.user_roles
        )
        
        # Mark forum as visited for read tracking
        mark_forum_visited(g.user.id)
        
        return render_template(
            'forum/index.html',
            user=g.user,
            roles=g.user_roles,
            categories=categories,
            posts_data=posts_data,
            selected_category=selected_category,
            current_search=search_query
        )
        
    except Exception as e:
        logging.error(f"Error loading forum: {e}")
        return render_template(
            'forum/index.html',
            user=g.user,
            roles=g.user_roles,
            categories=[],
            posts_data={'posts': [], 'total': 0, 'pages': 0},
            error="Fehler beim Laden des Forums"
        )

@forum_bp.route('/post/<int:post_id>')
@login_required
def view_post(post_id):
    """View individual forum post with comments"""
    try:
        post = get_forum_post_by_id(post_id)
        
        if not post:
            flash('Post nicht gefunden.', 'error')
            return redirect(url_for('forum.index'))
        
        # Check category permission
        if not check_category_permission(post['category_id'], g.user_roles):
            flash('Keine Berechtigung für diese Kategorie.', 'error')
            return redirect(url_for('forum.index'))
        
        # Convert markdown to HTML
        post_dict = dict(post)
        post_dict['content_html'] = markdown.markdown(post['content'], extensions=['codehilite', 'fenced_code'])
        
        # Mark post as read
        mark_post_as_read(g.user.id, post_id)
        
        # Get attachments
        attachments = get_post_attachments(post_id)
        
        # Get comments
        comments = get_post_comments(post_id)
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='view_forum_post',
            resource_type='forum_post',
            resource_id=str(post_id)
        )
        
        return render_template(
            'forum/view_post.html',
            user=g.user,
            roles=g.user_roles,
            post=post_dict,
            attachments=attachments,
            comments=comments
        )
        
    except Exception as e:
        logging.error(f"Error viewing post {post_id}: {e}")
        flash('Fehler beim Laden des Posts.', 'error')
        return redirect(url_for('forum.index'))

@forum_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_post():
    """Create new forum post"""
    if request.method == 'POST':
        try:
            title = request.form.get('title', '').strip()
            content = request.form.get('content', '').strip()
            summary = request.form.get('summary', '').strip()
            category_id = request.form.get('category_id', type=int)
            
            # Validation
            if not title or not content:
                flash('Titel und Inhalt sind erforderlich.', 'error')
                return render_template(
                    'forum/create_post.html',
                    user=g.user,
                    roles=g.user_roles,
                    categories=get_accessible_categories(g.user_roles)
                )
            
            # Check category permission
            if category_id and not check_category_permission(category_id, g.user_roles):
                flash('Keine Berechtigung für diese Kategorie.', 'error')
                return render_template(
                    'forum/create_post.html',
                    user=g.user,
                    roles=g.user_roles,
                    categories=get_accessible_categories(g.user_roles)
                )
            
            # Create post
            db = get_db()
            cursor = db.execute('''
                INSERT INTO forum_posts (title, content, summary, category_id, author_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (title, content, summary, category_id, g.user.id, datetime.now()))
            
            post_id = cursor.lastrowid
            
            # Handle file uploads
            uploaded_files = request.files.getlist('attachments')
            upload_folder = ensure_upload_folder()
            
            for file in uploaded_files:
                if file and file.filename and allowed_file(file.filename):
                    # Generate unique filename
                    file_extension = file.filename.rsplit('.', 1)[1].lower()
                    unique_filename = f"{uuid.uuid4()}.{file_extension}"
                    file_path = os.path.join(upload_folder, unique_filename)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Save attachment record
                    db.execute('''
                        INSERT INTO forum_attachments (post_id, filename, original_filename, file_size)
                        VALUES (?, ?, ?, ?)
                    ''', (post_id, unique_filename, file.filename, os.path.getsize(file_path)))
            
            db.commit()
            
            # Log activity
            log_activity(
                user_id=g.user.id,
                action='create_forum_post',
                resource_type='forum_post',
                resource_id=str(post_id)
            )
            
            flash('Post erfolgreich erstellt!', 'success')
            return redirect(url_for('forum.view_post', post_id=post_id))
            
        except Exception as e:
            logging.error(f"Error creating post: {e}")
            flash('Fehler beim Erstellen des Posts.', 'error')
    
    # GET request - show form
    categories = get_accessible_categories(g.user_roles)
    return render_template(
        'forum/create_post.html',
        user=g.user,
        roles=g.user_roles,
        categories=categories
    )

@forum_bp.route('/edit/<int:post_id>', methods=['GET', 'POST'])
@login_required
def edit_post(post_id):
    """Edit existing forum post"""
    try:
        post = get_forum_post_by_id(post_id)
        
        if not post:
            flash('Post nicht gefunden.', 'error')
            return redirect(url_for('forum.index'))
        
        # Check if user is author or has management role
        if post['author_id'] != g.user.id and not g.user.has_management_role():
            flash('Keine Berechtigung zum Bearbeiten dieses Posts.', 'error')
            return redirect(url_for('forum.view_post', post_id=post_id))
        
        if request.method == 'POST':
            title = request.form.get('title', '').strip()
            content = request.form.get('content', '').strip()
            summary = request.form.get('summary', '').strip()
            category_id = request.form.get('category_id', type=int)
            
            # Validation
            if not title or not content:
                flash('Titel und Inhalt sind erforderlich.', 'error')
                return render_template(
                    'forum/edit_post.html',
                    user=g.user,
                    roles=g.user_roles,
                    post=post,
                    categories=get_accessible_categories(g.user_roles)
                )
            
            # Check category permission
            if category_id and not check_category_permission(category_id, g.user_roles):
                flash('Keine Berechtigung für diese Kategorie.', 'error')
                return render_template(
                    'forum/edit_post.html',
                    user=g.user,
                    roles=g.user_roles,
                    post=post,
                    categories=get_accessible_categories(g.user_roles)
                )
            
            # Update post
            db = get_db()
            db.execute('''
                UPDATE forum_posts 
                SET title = ?, content = ?, summary = ?, category_id = ?, updated_at = ?
                WHERE id = ?
            ''', (title, content, summary, category_id, datetime.now(), post_id))
            
            # Handle file uploads
            uploaded_files = request.files.getlist('attachments')
            upload_folder = ensure_upload_folder()
            
            for file in uploaded_files:
                if file and file.filename and allowed_file(file.filename):
                    # Generate unique filename
                    file_extension = file.filename.rsplit('.', 1)[1].lower()
                    unique_filename = f"{uuid.uuid4()}.{file_extension}"
                    file_path = os.path.join(upload_folder, unique_filename)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Save attachment record
                    db.execute('''
                        INSERT INTO forum_attachments (post_id, filename, original_filename, file_size)
                        VALUES (?, ?, ?, ?)
                    ''', (post_id, unique_filename, file.filename, os.path.getsize(file_path)))
            
            db.commit()
            
            # Log activity
            log_activity(
                user_id=g.user.id,
                action='edit_forum_post',
                resource_type='forum_post',
                resource_id=str(post_id)
            )
            
            flash('Post erfolgreich aktualisiert!', 'success')
            return redirect(url_for('forum.view_post', post_id=post_id))
        
        # GET request - show edit form
        categories = get_accessible_categories(g.user_roles)
        attachments = get_post_attachments(post_id)
        
        return render_template(
            'forum/edit_post.html',
            user=g.user,
            roles=g.user_roles,
            post=post,
            categories=categories,
            attachments=attachments
        )
        
    except Exception as e:
        logging.error(f"Error editing post {post_id}: {e}")
        flash('Fehler beim Bearbeiten des Posts.', 'error')
        return redirect(url_for('forum.index'))

@forum_bp.route('/categories')
@login_required
@role_required('Projektleitung', 'Developer', 'Head Management')
def manage_categories():
    """Manage forum categories with role permissions"""
    try:
        categories = get_db().execute('''
            SELECT id, name, description, required_roles, created_at,
                   (SELECT COUNT(*) FROM forum_posts WHERE category_id = fc.id) as post_count
            FROM forum_categories fc
            ORDER BY name
        ''').fetchall()
        
        # Available roles for permissions
        available_roles = ['Projektleitung', 'Head Management', 'Management', 'Developer', 'Diamond Club', 'Diamond Teams', 'Entropy Member']
        
        return render_template(
            'forum/categories.html',
            user=g.user,
            roles=g.user_roles,
            categories=categories,
            available_roles=available_roles
        )
        
    except Exception as e:
        logging.error(f"Error loading categories: {e}")
        return render_template(
            'forum/categories.html',
            user=g.user,
            roles=g.user_roles,
            categories=[],
            available_roles=[],
            error="Fehler beim Laden der Kategorien"
        )

@forum_bp.route('/categories/create', methods=['POST'])
@login_required
@role_required('Projektleitung', 'Developer', 'Head Management')
def create_category():
    """Create new category with role permissions"""
    try:
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        required_roles = request.form.getlist('required_roles[]')
        
        if not name:
            flash('Kategoriename ist erforderlich.', 'error')
            return redirect(url_for('forum.manage_categories'))
        
        # Convert roles list to comma-separated string
        roles_string = ','.join(required_roles) if required_roles else None
        
        db = get_db()
        db.execute('''
            INSERT INTO forum_categories (name, description, required_roles, created_by)
            VALUES (?, ?, ?, ?)
        ''', (name, description, roles_string, g.user.id))
        db.commit()
        
        log_activity(
            user_id=g.user.id,
            action='create_forum_category',
            resource_type='forum_category',
            details=f"Category: {name}, Roles: {roles_string}"
        )
        
        flash('Kategorie erfolgreich erstellt!', 'success')
        
    except Exception as e:
        logging.error(f"Error creating category: {e}")
        flash('Fehler beim Erstellen der Kategorie.', 'error')
    
    return redirect(url_for('forum.manage_categories'))

@forum_bp.route('/categories/<int:category_id>/edit', methods=['POST'])
@login_required
@role_required('Projektleitung', 'Developer', 'Head Management')
def edit_category(category_id):
    """Edit category permissions"""
    try:
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        required_roles = request.form.getlist('required_roles[]')
        
        if not name:
            flash('Kategoriename ist erforderlich.', 'error')
            return redirect(url_for('forum.manage_categories'))
        
        # Convert roles list to comma-separated string
        roles_string = ','.join(required_roles) if required_roles else None
        
        db = get_db()
        db.execute('''
            UPDATE forum_categories 
            SET name = ?, description = ?, required_roles = ?
            WHERE id = ?
        ''', (name, description, roles_string, category_id))
        db.commit()
        
        log_activity(
            user_id=g.user.id,
            action='edit_forum_category',
            resource_type='forum_category',
            resource_id=str(category_id),
            details=f"Category: {name}, Roles: {roles_string}"
        )
        
        flash('Kategorie erfolgreich aktualisiert!', 'success')
        
    except Exception as e:
        logging.error(f"Error editing category {category_id}: {e}")
        flash('Fehler beim Bearbeiten der Kategorie.', 'error')
    
    return redirect(url_for('forum.manage_categories'))

@forum_bp.route('/generate-summary', methods=['POST'])
@login_required
def generate_summary():
    """Generate summary using Grok AI API"""
    try:
        content = request.json.get('content', '').strip()
        
        if not content:
            return jsonify({'success': False, 'error': 'Kein Inhalt bereitgestellt.'})
        
        # Grok AI API call (you'll need to configure this)
        grok_api_url = current_app.config.get('GROK_API_URL')
        grok_api_key = current_app.config.get('GROK_API_KEY')
        
        if not grok_api_url or not grok_api_key:
            return jsonify({'success': False, 'error': 'Grok AI API nicht konfiguriert.'})
        
        headers = {
            'Authorization': f'Bearer {grok_api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'grok-beta',
            'messages': [
                {
                    'role': 'system',
                    'content': 'Du bist ein Assistent, der prägnante und aussagekräftige Zusammenfassungen erstellt. Erstelle eine Kurzzusammenfassung (max. 150 Zeichen) des folgenden Textes auf Deutsch.'
                },
                {
                    'role': 'user',
                    'content': content
                }
            ],
            'max_tokens': 50
        }
        
        response = requests.post(grok_api_url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            summary = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            
            if summary:
                return jsonify({'success': True, 'summary': summary})
            else:
                return jsonify({'success': False, 'error': 'Keine Zusammenfassung erhalten.'})
        else:
            logging.error(f"Grok API error: {response.status_code} - {response.text}")
            return jsonify({'success': False, 'error': 'Fehler bei der API-Anfrage.'})
            
    except requests.RequestException as e:
        logging.error(f"Error calling Grok API: {e}")
        return jsonify({'success': False, 'error': 'Verbindungsfehler zur AI API.'})
    except Exception as e:
        logging.error(f"Error generating summary: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Generieren der Zusammenfassung.'})

@forum_bp.route('/delete-attachment/<int:attachment_id>', methods=['POST'])
@login_required
def delete_attachment(attachment_id):
    """Delete forum attachment"""
    try:
        db = get_db()
        attachment = db.execute('''
            SELECT fa.filename, fa.post_id, fp.author_id
            FROM forum_attachments fa
            JOIN forum_posts fp ON fa.post_id = fp.id
            WHERE fa.id = ?
        ''', (attachment_id,)).fetchone()
        
        if not attachment:
            return jsonify({'success': False, 'error': 'Datei nicht gefunden.'})
        
        # Check permission (author or management)
        if attachment['author_id'] != g.user.id and not g.user.has_management_role():
            return jsonify({'success': False, 'error': 'Keine Berechtigung.'})
        
        # Delete file from filesystem
        file_path = os.path.join(current_app.static_folder, 'uploads', 'forum', attachment['filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        db.execute('DELETE FROM forum_attachments WHERE id = ?', (attachment_id,))
        db.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error deleting attachment {attachment_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Löschen der Datei.'})

@forum_bp.route('/download/<int:attachment_id>')
@login_required
def download_attachment(attachment_id):
    """Download forum attachment"""
    try:
        db = get_db()
        attachment = db.execute('''
            SELECT fa.filename, fa.original_filename, fp.author_id, fp.category_id
            FROM forum_attachments fa
            JOIN forum_posts fp ON fa.post_id = fp.id
            WHERE fa.id = ?
        ''', (attachment_id,)).fetchone()
        
        if not attachment:
            flash('Datei nicht gefunden.', 'error')
            return redirect(url_for('forum.index'))
        
        # Check category permission
        if not check_category_permission(attachment['category_id'], g.user_roles):
            flash('Keine Berechtigung für diese Datei.', 'error')
            return redirect(url_for('forum.index'))
        
        file_path = os.path.join(current_app.static_folder, 'uploads', 'forum', attachment['filename'])
        
        if not os.path.exists(file_path):
            flash('Datei nicht gefunden auf dem Server.', 'error')
            return redirect(url_for('forum.index'))
        
        # Log download
        log_activity(
            user_id=g.user.id,
            action='download_forum_attachment',
            resource_type='forum_attachment',
            resource_id=str(attachment_id)
        )
        
        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=attachment['original_filename']
        )
        
    except Exception as e:
        logging.error(f"Error downloading attachment {attachment_id}: {e}")
        flash('Fehler beim Herunterladen der Datei.', 'error')
        return redirect(url_for('forum.index'))

@forum_bp.route('/categories/<int:category_id>/delete', methods=['POST'])
@login_required
@role_required('Projektleitung', 'Developer', 'Head Management')
def delete_category(category_id):
    """Delete category"""
    try:
        db = get_db()
        
        # Check if category has posts
        post_count = db.execute('''
            SELECT COUNT(*) as count FROM forum_posts WHERE category_id = ?
        ''', (category_id,)).fetchone()['count']
        
        if post_count > 0:
            return jsonify({'success': False, 'error': 'Kategorie kann nicht gelöscht werden - enthält noch Posts.'})
        
        # Delete category
        db.execute('DELETE FROM forum_categories WHERE id = ?', (category_id,))
        db.commit()
        
        log_activity(
            user_id=g.user.id,
            action='delete_forum_category',
            resource_type='forum_category',
            resource_id=str(category_id)
        )
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error deleting category {category_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Löschen der Kategorie.'})

# Comment routes
@forum_bp.route('/post/<int:post_id>/comment', methods=['POST'])
@login_required
def create_comment(post_id):
    """Create new comment"""
    try:
        content = request.form.get('content', '').strip()
        parent_id = request.form.get('parent_id', type=int) or None
        
        if not content:
            return jsonify({'success': False, 'error': 'Kommentar-Inhalt ist erforderlich.'})
        
        if len(content) > 2000:
            return jsonify({'success': False, 'error': 'Kommentar ist zu lang (max. 2000 Zeichen).'})
        
        # Check if post exists and user has permission
        db = get_db()
        post = db.execute('SELECT category_id FROM forum_posts WHERE id = ?', (post_id,)).fetchone()
        if not post:
            return jsonify({'success': False, 'error': 'Post nicht gefunden.'})
        
        if not check_category_permission(post['category_id'], g.user_roles):
            return jsonify({'success': False, 'error': 'Keine Berechtigung.'})
        
        # Create comment
        cursor = db.execute('''
            INSERT INTO forum_comments (post_id, author_id, content, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (post_id, g.user.id, content, parent_id, datetime.now()))
        
        comment_id = cursor.lastrowid
        db.commit()
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='create_forum_comment',
            resource_type='forum_comment',
            resource_id=str(comment_id)
        )
        
        return jsonify({'success': True, 'comment_id': comment_id})
        
    except Exception as e:
        logging.error(f"Error creating comment: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Erstellen des Kommentars.'})

@forum_bp.route('/comment/<int:comment_id>/edit', methods=['POST'])
@login_required
def edit_comment(comment_id):
    """Edit existing comment"""
    try:
        content = request.form.get('content', '').strip()
        
        if not content:
            return jsonify({'success': False, 'error': 'Kommentar-Inhalt ist erforderlich.'})
        
        if len(content) > 2000:
            return jsonify({'success': False, 'error': 'Kommentar ist zu lang (max. 2000 Zeichen).'})
        
        db = get_db()
        
        # Get comment and check permissions
        comment = db.execute('''
            SELECT fc.*, fp.category_id 
            FROM forum_comments fc
            JOIN forum_posts fp ON fc.post_id = fp.id
            WHERE fc.id = ?
        ''', (comment_id,)).fetchone()
        
        if not comment:
            return jsonify({'success': False, 'error': 'Kommentar nicht gefunden.'})
        
        # Check if user is author or has management role
        if comment['author_id'] != g.user.id and not g.user.has_management_role():
            return jsonify({'success': False, 'error': 'Keine Berechtigung zum Bearbeiten.'})
        
        # Check category permission
        if not check_category_permission(comment['category_id'], g.user_roles):
            return jsonify({'success': False, 'error': 'Keine Berechtigung.'})
        
        # Update comment
        db.execute('''
            UPDATE forum_comments 
            SET content = ?, updated_at = ?
            WHERE id = ?
        ''', (content, datetime.now(), comment_id))
        db.commit()
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='edit_forum_comment',
            resource_type='forum_comment',
            resource_id=str(comment_id)
        )
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error editing comment {comment_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Bearbeiten des Kommentars.'})

@forum_bp.route('/comment/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_comment(comment_id):
    """Delete comment (soft delete)"""
    try:
        db = get_db()
        
        # Get comment and check permissions
        comment = db.execute('''
            SELECT fc.*, fp.category_id 
            FROM forum_comments fc
            JOIN forum_posts fp ON fc.post_id = fp.id
            WHERE fc.id = ?
        ''', (comment_id,)).fetchone()
        
        if not comment:
            return jsonify({'success': False, 'error': 'Kommentar nicht gefunden.'})
        
        # Check if user is author or has management role
        if comment['author_id'] != g.user.id and not g.user.has_management_role():
            return jsonify({'success': False, 'error': 'Keine Berechtigung zum Löschen.'})
        
        # Check category permission
        if not check_category_permission(comment['category_id'], g.user_roles):
            return jsonify({'success': False, 'error': 'Keine Berechtigung.'})
        
        # Soft delete comment
        db.execute('''
            UPDATE forum_comments 
            SET is_deleted = TRUE, updated_at = ?
            WHERE id = ?
        ''', (datetime.now(), comment_id))
        db.commit()
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='delete_forum_comment',
            resource_type='forum_comment',
            resource_id=str(comment_id)
        )
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error deleting comment {comment_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Löschen des Kommentars.'})

# Helper functions
def get_forum_posts(search_query='', category_filter=None, page=1, user_id=None, user_roles=None, items_per_page=20):
    """Get forum posts with search, category filter and permission check"""
    db = get_db()
    offset = (page - 1) * items_per_page
    
    # Build WHERE clause with permission check
    where_conditions = []
    params = []
    
    # Category permissions check
    accessible_categories = get_accessible_categories(user_roles or [])
    if accessible_categories:
        category_ids = [str(cat['id']) for cat in accessible_categories]
        where_conditions.append(f'(fp.category_id IS NULL OR fp.category_id IN ({",".join(["?"] * len(category_ids))}))')
        params.extend(category_ids)
    else:
        where_conditions.append('fp.category_id IS NULL')
    
    if search_query:
        where_conditions.append('(fp.title LIKE ? OR fp.content LIKE ? OR fp.summary LIKE ?)')
        params.extend([f'%{search_query}%', f'%{search_query}%', f'%{search_query}%'])
    
    if category_filter:
        where_conditions.append('fp.category_id = ?')
        params.append(category_filter)
    
    where_clause = 'WHERE ' + ' AND '.join(where_conditions) if where_conditions else ''
    
    # Get total count
    count_sql = f'''
        SELECT COUNT(*) as total
        FROM forum_posts fp
        {where_clause}
    '''
    total = db.execute(count_sql, params).fetchone()['total']
    
    # Get posts
    posts_sql = f'''
        SELECT fp.id, fp.title, fp.content, fp.summary, fp.created_at, fp.updated_at,
               u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
               fc.name as category_name,
               (SELECT COUNT(*) FROM forum_attachments WHERE post_id = fp.id) as attachment_count,
               (SELECT COUNT(*) FROM forum_comments WHERE post_id = fp.id AND is_deleted = FALSE) as comment_count,
               CASE WHEN fpr.user_id IS NULL THEN 1 ELSE 0 END as is_unread
        FROM forum_posts fp
        LEFT JOIN users u ON fp.author_id = u.id
        LEFT JOIN forum_categories fc ON fp.category_id = fc.id
        LEFT JOIN forum_post_reads fpr ON fp.id = fpr.post_id AND fpr.user_id = ?
        {where_clause}
        ORDER BY fp.created_at DESC
        LIMIT ? OFFSET ?
    '''
    
    final_params = [user_id] + params + [items_per_page, offset]
    posts = db.execute(posts_sql, final_params).fetchall()
    
    pages = (total + items_per_page - 1) // items_per_page
    
    return {
        'posts': posts,
        'total': total,
        'pages': pages,
        'current_page': page
    }

def get_forum_post_by_id(post_id):
    """Get single forum post by ID"""
    db = get_db()
    return db.execute('''
        SELECT fp.*, u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
               fc.name as category_name
        FROM forum_posts fp
        LEFT JOIN users u ON fp.author_id = u.id
        LEFT JOIN forum_categories fc ON fp.category_id = fc.id
        WHERE fp.id = ?
    ''', (post_id,)).fetchone()

def get_post_attachments(post_id):
    """Get attachments for a post"""
    db = get_db()
    return db.execute('''
        SELECT id, original_filename, file_size, created_at
        FROM forum_attachments
        WHERE post_id = ?
        ORDER BY created_at
    ''', (post_id,)).fetchall()

def get_post_comments(post_id):
    """Get comments for a post in hierarchical structure"""
    db = get_db()
    
    # Get all comments for the post
    comments = db.execute('''
        SELECT fc.*, u.username, u.display_name, u.avatar_url
        FROM forum_comments fc
        JOIN users u ON fc.author_id = u.id
        WHERE fc.post_id = ? AND fc.is_deleted = FALSE
        ORDER BY fc.created_at ASC
    ''', (post_id,)).fetchall()
    
    # Convert to dict and organize hierarchy
    comments_dict = {}
    root_comments = []
    
    for comment in comments:
        comment_dict = dict(comment)
        comment_dict['replies'] = []
        comments_dict[comment['id']] = comment_dict
        
        if comment['parent_id'] is None:
            root_comments.append(comment_dict)
        else:
            parent = comments_dict.get(comment['parent_id'])
            if parent:
                parent['replies'].append(comment_dict)
    
    return root_comments

def mark_post_as_read(user_id, post_id):
    """Mark a post as read for a user"""
    db = get_db()
    db.execute('''
        INSERT OR IGNORE INTO forum_post_reads (user_id, post_id, read_at)
        VALUES (?, ?, ?)
    ''', (user_id, post_id, datetime.now()))
    db.commit()

def mark_forum_visited(user_id):
    """Mark that user visited the forum (for read tracking)"""
    pass