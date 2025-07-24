# webapp/internal/blueprints/forum/__init__.py (updated with comments)

from flask import Blueprint, render_template, request, redirect, url_for, flash, g, jsonify, current_app
from werkzeug.utils import secure_filename
from utils.decorators import login_required
from database.db_manager import get_db, log_activity
import os
import uuid
import logging
from datetime import datetime

forum_bp = Blueprint('forum', __name__, url_prefix='/forum')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'pptx'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_folder():
    """Ensure upload folder exists"""
    upload_folder = os.path.join(current_app.static_folder, 'uploads', 'forum')
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder

@forum_bp.route('/')
@login_required
def index():
    """Forum dashboard with search functionality"""
    try:
        search_query = request.args.get('search', '').strip()
        category_filter = request.args.get('category', '')
        page = request.args.get('page', 1, type=int)
        
        # Get categories for filter dropdown
        categories = get_forum_categories()
        
        # Get posts with search and filter
        posts_data = get_forum_posts(
            search_query=search_query,
            category_filter=category_filter,
            page=page,
            user_id=g.user.id
        )
        
        # Mark forum as visited for read tracking
        mark_forum_visited(g.user.id)
        
        return render_template(
            'forum/index.html',
            user=g.user,
            roles=g.user_roles,
            categories=categories,
            posts_data=posts_data,
            current_search=search_query,
            current_category_filter=category_filter
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
            post=post,
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
            category_id = request.form.get('category_id', type=int)
            
            # Validation
            if not title or not content:
                flash('Titel und Inhalt sind erforderlich.', 'error')
                return render_template(
                    'forum/create_post.html',
                    user=g.user,
                    roles=g.user_roles,
                    categories=get_forum_categories()
                )
            
            # Create post
            db = get_db()
            cursor = db.execute('''
                INSERT INTO forum_posts (title, content, category_id, author_id, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, content, category_id, g.user.id, datetime.now()))
            
            post_id = cursor.lastrowid
            
            # Handle file uploads
            uploaded_files = request.files.getlist('attachments')
            if uploaded_files:
                upload_folder = ensure_upload_folder()
                
                for file in uploaded_files:
                    if file and file.filename and allowed_file(file.filename):
                        # Generate unique filename
                        filename = secure_filename(file.filename)
                        unique_filename = f"{uuid.uuid4().hex}_{filename}"
                        file_path = os.path.join(upload_folder, unique_filename)
                        
                        # Save file
                        file.save(file_path)
                        
                        # Save to database
                        db.execute('''
                            INSERT INTO forum_attachments (post_id, filename, original_filename, file_size)
                            VALUES (?, ?, ?, ?)
                        ''', (post_id, unique_filename, filename, os.path.getsize(file_path)))
            
            db.commit()
            
            # Log activity
            log_activity(
                user_id=g.user.id,
                action='create_forum_post',
                resource_type='forum_post',
                resource_id=str(post_id),
                details=f"Title: {title}"
            )
            
            flash('Post erfolgreich erstellt!', 'success')
            return redirect(url_for('forum.view_post', post_id=post_id))
            
        except Exception as e:
            logging.error(f"Error creating post: {e}")
            flash('Fehler beim Erstellen des Posts.', 'error')
    
    # GET request - show form
    categories = get_forum_categories()
    return render_template(
        'forum/create_post.html',
        user=g.user,
        roles=g.user_roles,
        categories=categories
    )

@forum_bp.route('/categories')
@login_required
def manage_categories():
    """Manage forum categories (simple list view)"""
    try:
        categories = get_forum_categories()
        
        return render_template(
            'forum/categories.html',
            user=g.user,
            roles=g.user_roles,
            categories=categories
        )
        
    except Exception as e:
        logging.error(f"Error loading categories: {e}")
        return render_template(
            'forum/categories.html',
            user=g.user,
            roles=g.user_roles,
            categories=[],
            error="Fehler beim Laden der Kategorien"
        )

@forum_bp.route('/categories/create', methods=['POST'])
@login_required
def create_category():
    """Create new category"""
    try:
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        
        if not name:
            flash('Kategoriename ist erforderlich.', 'error')
            return redirect(url_for('forum.manage_categories'))
        
        db = get_db()
        db.execute('''
            INSERT INTO forum_categories (name, description, created_by)
            VALUES (?, ?, ?)
        ''', (name, description, g.user.id))
        db.commit()
        
        log_activity(
            user_id=g.user.id,
            action='create_forum_category',
            resource_type='forum_category',
            details=f"Category: {name}"
        )
        
        flash('Kategorie erfolgreich erstellt!', 'success')
        
    except Exception as e:
        logging.error(f"Error creating category: {e}")
        flash('Fehler beim Erstellen der Kategorie.', 'error')
    
    return redirect(url_for('forum.manage_categories'))

@forum_bp.route('/download/<int:attachment_id>')
@login_required
def download_attachment(attachment_id):
    """Download forum attachment"""
    try:
        db = get_db()
        attachment = db.execute('''
            SELECT fa.filename, fa.original_filename, fp.author_id
            FROM forum_attachments fa
            JOIN forum_posts fp ON fa.post_id = fp.id
            WHERE fa.id = ?
        ''', (attachment_id,)).fetchone()
        
        if not attachment:
            flash('Datei nicht gefunden.', 'error')
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

# ===== COMMENT ROUTES =====

@forum_bp.route('/post/<int:post_id>/comment', methods=['POST'])
@login_required
def create_comment(post_id):
    """Create new comment"""
    try:
        content = request.form.get('content', '').strip()
        parent_id = request.form.get('parent_id', type=int) or None
        
        # Debug logging
        logging.info(f"Creating comment: post_id={post_id}, user_id={g.user.id}, content_length={len(content)}, parent_id={parent_id}")
        
        if not content:
            return jsonify({'success': False, 'error': 'Kommentar-Inhalt ist erforderlich.'})
        
        if len(content) > 2000:
            return jsonify({'success': False, 'error': 'Kommentar ist zu lang (max. 2000 Zeichen).'})
        
        # Check if post exists
        db = get_db()
        post = db.execute('SELECT id FROM forum_posts WHERE id = ?', (post_id,)).fetchone()
        if not post:
            return jsonify({'success': False, 'error': 'Post nicht gefunden.'})
        
        # Create comment
        cursor = db.execute('''
            INSERT INTO forum_comments (post_id, author_id, content, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (post_id, g.user.id, content, parent_id, datetime.now()))
        
        comment_id = cursor.lastrowid
        db.commit()
        
        logging.info(f"Comment created successfully: comment_id={comment_id}")
        
        # Get the created comment with author info
        comment = db.execute('''
            SELECT fc.*, u.username, u.display_name, u.avatar_url
            FROM forum_comments fc
            JOIN users u ON fc.author_id = u.id
            WHERE fc.id = ?
        ''', (comment_id,)).fetchone()
        
        if not comment:
            logging.error(f"Failed to retrieve created comment: comment_id={comment_id}")
            return jsonify({'success': False, 'error': 'Fehler beim Abrufen des erstellten Kommentars.'})
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='create_forum_comment',
            resource_type='forum_comment',
            resource_id=str(comment_id),
            details=f"Post ID: {post_id}"
        )
        
        return jsonify({
            'success': True, 
            'comment': dict(comment),
            'message': 'Kommentar erfolgreich erstellt!'
        })
        
    except Exception as e:
        logging.error(f"Error creating comment: {e}")
        import traceback
        traceback.print_exc()
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
        
        # Check if comment exists and user is owner
        comment = db.execute('''
            SELECT author_id FROM forum_comments 
            WHERE id = ? AND is_deleted = FALSE
        ''', (comment_id,)).fetchone()
        
        if not comment:
            return jsonify({'success': False, 'error': 'Kommentar nicht gefunden.'})
        
        if comment['author_id'] != g.user.id:
            return jsonify({'success': False, 'error': 'Keine Berechtigung zum Bearbeiten.'})
        
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
        
        return jsonify({
            'success': True,
            'content': content,
            'message': 'Kommentar erfolgreich bearbeitet!'
        })
        
    except Exception as e:
        logging.error(f"Error editing comment {comment_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Bearbeiten des Kommentars.'})

@forum_bp.route('/comment/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_comment(comment_id):
    """Delete comment (soft delete)"""
    try:
        db = get_db()
        
        # Check if comment exists and user is owner
        comment = db.execute('''
            SELECT author_id FROM forum_comments 
            WHERE id = ? AND is_deleted = FALSE
        ''', (comment_id,)).fetchone()
        
        if not comment:
            return jsonify({'success': False, 'error': 'Kommentar nicht gefunden.'})
        
        if comment['author_id'] != g.user.id:
            return jsonify({'success': False, 'error': 'Keine Berechtigung zum Löschen.'})
        
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
        
        return jsonify({
            'success': True,
            'message': 'Kommentar erfolgreich gelöscht!'
        })
        
    except Exception as e:
        logging.error(f"Error deleting comment {comment_id}: {e}")
        return jsonify({'success': False, 'error': 'Fehler beim Löschen des Kommentars.'})

# ===== API ROUTES =====

@forum_bp.route('/api/mark-read/<int:post_id>', methods=['POST'])
@login_required
def api_mark_read(post_id):
    """API endpoint to mark post as read"""
    try:
        mark_post_as_read(g.user.id, post_id)
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error marking post {post_id} as read: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@forum_bp.route('/api/unread-count')
@login_required
def api_unread_count():
    """API endpoint to get unread posts count"""
    try:
        db = get_db()
        count = db.execute('''
            SELECT COUNT(*) as unread_count
            FROM forum_posts fp
            LEFT JOIN forum_post_reads fpr ON fp.id = fpr.post_id AND fpr.user_id = ?
            WHERE fpr.user_id IS NULL
        ''', (g.user.id,)).fetchone()
        
        return jsonify({
            'success': True,
            'count': count['unread_count'] if count else 0
        })
    except Exception as e:
        logging.error(f"Error getting unread count: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== HELPER FUNCTIONS =====

def get_forum_categories():
    """Get all forum categories"""
    db = get_db()
    return db.execute('''
        SELECT id, name, description, 
               (SELECT COUNT(*) FROM forum_posts WHERE category_id = fc.id) as post_count
        FROM forum_categories fc
        ORDER BY name
    ''').fetchall()

def get_forum_posts(search_query='', category_filter='', page=1, user_id=None, items_per_page=20):
    """Get forum posts with search and pagination"""
    db = get_db()
    offset = (page - 1) * items_per_page
    
    # Build WHERE clause
    where_conditions = []
    params = []
    
    if search_query:
        where_conditions.append('(fp.title LIKE ? OR fp.content LIKE ?)')
        params.extend([f'%{search_query}%', f'%{search_query}%'])
    
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
        SELECT fp.id, fp.title, fp.content, fp.created_at, fp.updated_at,
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
    # Could be used for additional read tracking logic if needed
    pass