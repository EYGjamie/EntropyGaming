// webapp/internal/static/js/forum-comments.js

/**
 * Forum Comments JavaScript functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeCommentForms();
    initializeCharacterCounters();
    initializeCommentActions();
});

/**
 * Initialize all comment forms
 */
function initializeCommentForms() {
    // Main comment form
    const mainForm = document.getElementById('mainCommentForm');
    if (mainForm) {
        console.log('Binding main comment form');
        mainForm.addEventListener('submit', handleCommentSubmit);
    }

    // Reply forms (existing ones)
    const replyForms = document.querySelectorAll('.reply-form');
    console.log('Found reply forms:', replyForms.length);
    replyForms.forEach(form => {
        form.addEventListener('submit', handleCommentSubmit);
    });

    // Edit comment form
    const editForm = document.getElementById('editCommentForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditCommentSubmit);
    }
}

/**
 * Initialize character counters for textareas
 */
function initializeCharacterCounters() {
    const textareas = document.querySelectorAll('.comment-form textarea, #editCommentContent');
    
    textareas.forEach(textarea => {
        const counter = textarea.closest('.comment-form, .modal-body')?.querySelector('.char-counter .char-count');
        if (counter) {
            // Initial count
            updateCharCounter(textarea, counter);
            
            // Update on input
            textarea.addEventListener('input', () => updateCharCounter(textarea, counter));
        }
    });
}

/**
 * Update character counter
 */
function updateCharCounter(textarea, counter) {
    const length = textarea.value.length;
    const maxLength = parseInt(textarea.getAttribute('maxlength')) || 2000;
    
    counter.textContent = length;
    
    // Update styling based on length
    const counterContainer = counter.closest('.char-counter');
    counterContainer.classList.remove('warning', 'danger');
    
    if (length > maxLength * 0.9) {
        counterContainer.classList.add('danger');
    } else if (length > maxLength * 0.8) {
        counterContainer.classList.add('warning');
    }
}

/**
 * Initialize comment action buttons
 */
function initializeCommentActions() {
    // Edit buttons are handled by onclick attributes in template
    // Delete buttons are handled by onclick attributes in template
    // Reply buttons are handled by onclick attributes in template
}

/**
 * Handle comment form submission
 */
async function handleCommentSubmit(event) {
    console.log('handleCommentSubmit called');
    event.preventDefault(); // Verhindere Standard-Formular-Submit
    event.stopPropagation(); // Verhindere Event-Bubbling
    
    console.log('Form submission prevented, processing with AJAX');
    
    // Das Form-Element korrekt finden
    let form;
    if (event.target.tagName === 'FORM') {
        form = event.target;
    } else {
        // Falls event.target der Button ist, finde das parent form
        form = event.target.closest('form');
    }
    
    if (!form) {
        console.error('Could not find form element');
        return false;
    }
    
    console.log('Found form:', form);
    
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const textarea = form.querySelector('textarea');
    
    // Get post_id from form data instead of global variable
    const postId = formData.get('post_id') || (window.currentPostId || null);
    
    // Debug: Log form data
    console.log('Form data:', Object.fromEntries(formData));
    console.log('Post ID:', postId);
    console.log('Form action:', form.action);
    console.log('Form method:', form.method);
    
    if (!postId) {
        console.error('No post ID found!');
        ForumUtils.showNotification('Fehler: Post ID nicht gefunden.', 'error');
        return false;
    }
    
    // Validate content
    const content = formData.get('content');
    if (!content || content.trim() === '') {
        ForumUtils.showNotification('Bitte gib einen Kommentar ein.', 'error');
        return false;
    }
    
    if (content.trim().length > 2000) {
        ForumUtils.showNotification('Kommentar ist zu lang (max. 2000 Zeichen).', 'error');
        return false;
    }
    
    // Ensure post_id is set in form data
    formData.set('post_id', postId);
    
    // Show loading state
    form.classList.add('submitting');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    
    try {
        const url = `/forum/post/${postId}/comment`;
        console.log('Sending POST request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin' // Include cookies for authentication
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Expected JSON but got:', text);
            throw new Error('Server returned non-JSON response: ' + text.substring(0, 200));
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            // Reload the page to show the new comment
            window.location.reload();
        } else {
            ForumUtils.showNotification(data.error || 'Unbekannter Fehler', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        ForumUtils.showNotification('Fehler beim Senden des Kommentars: ' + error.message, 'error');
    } finally {
        // Remove loading state
        form.classList.remove('submitting');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
    
    return false; // Zusätzliche Sicherheit
}

/**
 * Add new comment to DOM
 */
function addCommentToDOM(comment, form) {
    const commentsList = document.getElementById('commentsList');
    const noComments = commentsList.querySelector('.no-comments');
    
    // Remove "no comments" message if it exists
    if (noComments) {
        noComments.remove();
    }
    
    // Create comment HTML
    const commentHtml = createCommentHTML(comment);
    
    if (form.classList.contains('reply-form')) {
        // It's a reply - add to parent comment's replies
        const parentId = form.getAttribute('data-parent-id');
        const parentComment = document.querySelector(`[data-comment-id="${parentId}"]`);
        
        let repliesContainer = parentComment.querySelector('.comment-replies');
        if (!repliesContainer) {
            repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies';
            parentComment.appendChild(repliesContainer);
        }
        
        const replyElement = document.createElement('div');
        replyElement.innerHTML = createReplyHTML(comment);
        replyElement.className = 'comment-item reply-comment new-comment';
        replyElement.setAttribute('data-comment-id', comment.id);
        
        repliesContainer.appendChild(replyElement);
    } else {
        // It's a main comment - add to top of comments list
        const commentElement = document.createElement('div');
        commentElement.innerHTML = commentHtml;
        commentElement.className = 'comment-item new-comment';
        commentElement.setAttribute('data-comment-id', comment.id);
        
        commentsList.insertBefore(commentElement, commentsList.firstChild);
    }
    
    // Update comments counter
    updateCommentsCounter();
}

/**
 * Create comment HTML
 */
function createCommentHTML(comment) {
    const avatarHtml = comment.avatar_url 
        ? `<img src="${comment.avatar_url}" alt="Profilbild" class="profile-image">`
        : `<div class="profile-avatar-placeholder">${(comment.display_name || comment.username)[0].toUpperCase()}</div>`;
    
    const isOwner = comment.author_id === window.currentUserId; // This should be set globally
    const actionsHtml = isOwner ? `
        <div class="comment-actions">
            <button class="comment-action-btn" onclick="editComment(${comment.id})" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="comment-action-btn delete-btn" onclick="deleteComment(${comment.id})" title="Löschen">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    ` : '';
    
    // Get post_id from the main form
    const mainForm = document.getElementById('mainCommentForm');
    const postId = mainForm ? mainForm.querySelector('input[name="post_id"]').value : 
                 (window.currentPostId || '1');
    
    return `
        <div class="comment-header">
            <div class="comment-author">
                <div class="comment-author-avatar">
                    ${avatarHtml}
                </div>
                <div class="comment-author-info">
                    <div class="comment-author-name">${comment.display_name || comment.username}</div>
                    <div class="comment-date">gerade eben</div>
                </div>
            </div>
            ${actionsHtml}
        </div>
        
        <div class="comment-content" id="commentContent${comment.id}">
            ${comment.content.replace(/\n/g, '<br>')}
        </div>
        
        <div class="comment-footer">
            <button class="comment-reply-btn" onclick="showReplyForm(${comment.id})">
                <i class="bi bi-reply"></i> Antworten
            </button>
        </div>
        
        <div class="reply-form-container" id="replyForm${comment.id}" style="display: none;">
            <form class="comment-form reply-form" method="POST" action="/forum/post/${postId}/comment" data-parent-id="${comment.id}">
                <input type="hidden" name="post_id" value="${postId}">
                <input type="hidden" name="parent_id" value="${comment.id}">
                <div class="comment-form-header">
                    <div class="comment-author-avatar">
                        ${window.currentUserAvatar || `<div class="profile-avatar-placeholder">${window.currentUserName[0].toUpperCase()}</div>`}
                    </div>
                    <div class="comment-author-name">${window.currentUserName}</div>
                </div>
                <div class="comment-form-body">
                    <textarea name="content" 
                              placeholder="Antwort auf ${comment.display_name || comment.username}..." 
                              maxlength="2000" 
                              required></textarea>
                    <div class="comment-form-actions">
                        <div class="char-counter">
                            <span class="char-count">0</span> / 2000
                        </div>
                        <div class="reply-actions">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="hideReplyForm(${comment.id})">
                                Abbrechen
                            </button>
                            <button type="submit" class="btn btn-primary btn-sm">
                                <i class="bi bi-send"></i> Antworten
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;
}

/**
 * Create reply HTML (simpler version for nested replies)
 */
function createReplyHTML(comment) {
    const avatarHtml = comment.avatar_url 
        ? `<img src="${comment.avatar_url}" alt="Profilbild" class="profile-image">`
        : `<div class="profile-avatar-placeholder">${(comment.display_name || comment.username)[0].toUpperCase()}</div>`;
    
    const isOwner = comment.author_id === window.currentUserId;
    const actionsHtml = isOwner ? `
        <div class="comment-actions">
            <button class="comment-action-btn" onclick="editComment(${comment.id})" title="Bearbeiten">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="comment-action-btn delete-btn" onclick="deleteComment(${comment.id})" title="Löschen">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    ` : '';
    
    return `
        <div class="comment-header">
            <div class="comment-author">
                <div class="comment-author-avatar">
                    ${avatarHtml}
                </div>
                <div class="comment-author-info">
                    <div class="comment-author-name">${comment.display_name || comment.username}</div>
                    <div class="comment-date">gerade eben</div>
                </div>
            </div>
            ${actionsHtml}
        </div>
        
        <div class="comment-content" id="commentContent${comment.id}">
            ${comment.content.replace(/\n/g, '<br>')}
        </div>
    `;
}

/**
 * Show reply form for a comment
 */
function showReplyForm(commentId) {
    // Hide other reply forms first
    document.querySelectorAll('.reply-form-container').forEach(container => {
        if (container.id !== `replyForm${commentId}`) {
            container.style.display = 'none';
        }
    });
    
    const replyForm = document.getElementById(`replyForm${commentId}`);
    if (replyForm) {
        replyForm.style.display = 'block';
        replyForm.classList.add('show');
        
        // Focus on textarea
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
        
        // Initialize form if not already done
        const form = replyForm.querySelector('form');
        if (form && !form.hasAttribute('data-initialized')) {
            console.log('Initializing reply form for comment', commentId);
            form.addEventListener('submit', handleCommentSubmit);
            form.setAttribute('data-initialized', 'true');
            
            // Get post_id from the main form or from the page
            const mainForm = document.getElementById('mainCommentForm');
            const postId = mainForm ? mainForm.querySelector('input[name="post_id"]').value : 
                         (window.currentPostId || document.querySelector('input[name="post_id"]').value);
            
            // Set proper form attributes
            form.method = 'POST';
            form.action = `/forum/post/${postId}/comment`;
            
            // Initialize character counter
            const counter = form.querySelector('.char-counter .char-count');
            if (counter) {
                textarea.addEventListener('input', () => updateCharCounter(textarea, counter));
            }
        }
    }
}

/**
 * Hide reply form for a comment
 */
function hideReplyForm(commentId) {
    const replyForm = document.getElementById(`replyForm${commentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        replyForm.classList.remove('show');
        
        // Clear form
        const form = replyForm.querySelector('form');
        if (form) {
            form.reset();
            const counter = form.querySelector('.char-counter .char-count');
            const textarea = form.querySelector('textarea');
            if (counter && textarea) {
                updateCharCounter(textarea, counter);
            }
        }
    }
}

/**
 * Edit comment
 */
function editComment(commentId) {
    const commentContent = document.getElementById(`commentContent${commentId}`);
    if (!commentContent) return;
    
    // Get current content (remove HTML line breaks)
    const currentContent = commentContent.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    
    // Show edit modal
    const editModal = document.getElementById('editCommentModal');
    const editTextarea = document.getElementById('editCommentContent');
    
    if (editModal && editTextarea) {
        editTextarea.value = currentContent;
        editModal.style.display = 'flex';
        editTextarea.focus();
        
        // Update character counter
        const counter = editModal.querySelector('.char-counter .char-count');
        if (counter) {
            updateCharCounter(editTextarea, counter);
        }
        
        // Store current comment ID for submission
        currentEditCommentId = commentId;
    }
}

/**
 * Handle edit comment form submission
 */
async function handleEditCommentSubmit(event) {
    event.preventDefault();
    
    if (!currentEditCommentId) return;
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate content
    const content = formData.get('content').trim();
    if (!content) {
        ForumUtils.showNotification('Bitte gib einen Kommentar ein.', 'error');
        return;
    }
    
    if (content.length > 2000) {
        ForumUtils.showNotification('Kommentar ist zu lang (max. 2000 Zeichen).', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Speichern...';
    
    try {
        const response = await fetch(`/forum/comment/${currentEditCommentId}/edit`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update comment content in DOM
            const commentContent = document.getElementById(`commentContent${currentEditCommentId}`);
            if (commentContent) {
                commentContent.innerHTML = data.content.replace(/\n/g, '<br>');
                
                // Add "edited" indicator if not already present
                const commentHeader = commentContent.closest('.comment-item').querySelector('.comment-header');
                const authorInfo = commentHeader.querySelector('.comment-author-info');
                if (!authorInfo.querySelector('.comment-edited')) {
                    const editedIndicator = document.createElement('div');
                    editedIndicator.className = 'comment-edited';
                    editedIndicator.textContent = '(bearbeitet)';
                    authorInfo.appendChild(editedIndicator);
                }
            }
            
            closeEditCommentModal();
            ForumUtils.showNotification(data.message, 'success');
        } else {
            ForumUtils.showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error editing comment:', error);
        ForumUtils.showNotification('Fehler beim Bearbeiten des Kommentars.', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Speichern';
    }
}

/**
 * Delete comment
 */
async function deleteComment(commentId) {
    if (!confirm('Möchtest du diesen Kommentar wirklich löschen?')) {
        return;
    }
    
    try {
        const response = await fetch(`/forum/comment/${commentId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove comment from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    commentElement.remove();
                    updateCommentsCounter();
                    
                    // Show "no comments" message if no comments left
                    const commentsList = document.getElementById('commentsList');
                    if (commentsList && commentsList.children.length === 0) {
                        commentsList.innerHTML = `
                            <div class="no-comments">
                                <i class="bi bi-chat"></i>
                                <p>Noch keine Kommentare vorhanden. Schreibe den ersten Kommentar!</p>
                            </div>
                        `;
                    }
                }, 300);
            }
            
            ForumUtils.showNotification(data.message, 'success');
        } else {
            ForumUtils.showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        ForumUtils.showNotification('Fehler beim Löschen des Kommentars.', 'error');
    }
}

/**
 * Close edit comment modal
 */
function closeEditCommentModal() {
    const editModal = document.getElementById('editCommentModal');
    if (editModal) {
        editModal.style.display = 'none';
        
        // Reset form
        const form = editModal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        currentEditCommentId = null;
    }
}

/**
 * Update comments counter in post footer
 */
function updateCommentsCounter() {
    const commentsHeader = document.querySelector('.comments-header h3');
    const postFooter = document.querySelector('.post-footer .stat-item:has(i.bi-chat)');
    
    if (commentsHeader || postFooter) {
        const commentItems = document.querySelectorAll('.comment-item:not(.reply-comment)');
        const replyItems = document.querySelectorAll('.reply-comment');
        const totalComments = commentItems.length + replyItems.length;
        
        if (commentsHeader) {
            commentsHeader.innerHTML = `<i class="bi bi-chat-dots"></i> Kommentare (${totalComments})`;
        }
        
        if (postFooter) {
            postFooter.innerHTML = `
                <i class="bi bi-chat"></i>
                ${totalComments} Kommentar${totalComments !== 1 ? 'e' : ''}
            `;
        }
    }
}

// Add fadeOut animation CSS if not present
if (!document.querySelector('#comment-animations')) {
    const style = document.createElement('style');
    style.id = 'comment-animations';
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for global use
window.CommentUtils = {
    showReplyForm,
    hideReplyForm,
    editComment,
    deleteComment,
    closeEditCommentModal
};