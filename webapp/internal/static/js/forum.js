// webapp/internal/static/js/forum.js

/**
 * Forum-specific JavaScript functionality
 */

// Initialize forum features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearchFunctionality();
    initializePostActions();
    initializeFileUpload();
    initializeNotifications();
});

/**
 * Initialize search functionality
 */
function initializeSearchFunctionality() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    const categoryFilter = document.querySelector('.category-filter');
    
    if (!searchForm) return;
    
    // Auto-submit on category change
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            searchForm.submit();
        });
    }
    
    // Search suggestions (simple implementation)
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                // Could implement search suggestions here
                console.log('Search query:', this.value);
            }, 300);
        });
    }
}

/**
 * Initialize post action functionality
 */
function initializePostActions() {
    // Mark as read buttons
    const markReadButtons = document.querySelectorAll('.mark-read-btn');
    markReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            markPostAsRead(this.dataset.postId, this);
        });
    });
    
    // Share buttons
    const shareButtons = document.querySelectorAll('[onclick="sharePost()"]');
    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            sharePost();
        });
    });
}

/**
 * Mark a post as read
 */
function markPostAsRead(postId, button) {
    const postCard = button.closest('.post-card');
    
    fetch(`/forum/api/mark-read/${postId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove unread styling
            postCard.classList.remove('unread');
            
            // Remove unread indicator
            const unreadIndicator = postCard.querySelector('.unread-indicator');
            if (unreadIndicator) {
                unreadIndicator.remove();
            }
            
            // Remove the button
            button.remove();
            
            // Show success feedback
            showNotification('Post als gelesen markiert', 'success');
            
            // Update unread counter if exists
            updateUnreadCounter();
        } else {
            showNotification('Fehler beim Markieren des Posts', 'error');
        }
    })
    .catch(error => {
        console.error('Error marking post as read:', error);
        showNotification('Fehler beim Markieren des Posts', 'error');
    });
}

/**
 * Share post functionality
 */
function sharePost() {
    const currentUrl = window.location.href;
    
    // Try to use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: currentUrl
        }).catch(err => {
            console.log('Error sharing:', err);
            fallbackShare(currentUrl);
        });
    } else {
        fallbackShare(currentUrl);
    }
}

/**
 * Fallback share functionality
 */
function fallbackShare(url) {
    // Show share modal if it exists
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.value = url;
        }
        shareModal.style.display = 'flex';
        return;
    }
    
    // Simple copy to clipboard
    copyToClipboard(url);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Link in Zwischenablage kopiert', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

/**
 * Fallback copy to clipboard
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Link in Zwischenablage kopiert', 'success');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showNotification('Kopieren fehlgeschlagen', 'error');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Initialize file upload functionality
 */
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('attachments');
    
    if (!fileUploadArea || !fileInput) return;
    
    // Drag and drop functionality
    fileUploadArea.addEventListener('dragenter', handleDragEnter);
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleDrop);
    
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.add('dragover');
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!fileUploadArea.contains(e.relatedTarget)) {
            fileUploadArea.classList.remove('dragover');
        }
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && window.handleFiles) {
            window.handleFiles(files);
        }
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        max-width: 500px;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * Get notification color based on type
 */
function getNotificationColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    return colors[type] || colors.info;
}

/**
 * Update unread counter in navigation
 */
function updateUnreadCounter() {
    const unreadCounter = document.querySelector('.unread-counter');
    if (unreadCounter) {
        fetch('/forum/api/unread-count')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const count = data.count;
                    if (count > 0) {
                        unreadCounter.textContent = count;
                        unreadCounter.style.display = 'inline';
                    } else {
                        unreadCounter.style.display = 'none';
                    }
                }
            })
            .catch(err => console.error('Error updating unread counter:', err));
    }
}

/**
 * Initialize notifications system
 */
function initializeNotifications() {
    // Add CSS for notifications if not present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .notification-toast {
                font-family: inherit;
                font-size: 14px;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 5px;
                border-radius: 3px;
                opacity: 0.8;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
                background: rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global use
window.ForumUtils = {
    markPostAsRead,
    sharePost,
    showNotification,
    copyToClipboard,
    formatFileSize,
    debounce
};

function showCreateCategoryModal() {
    document.getElementById('createCategoryModal').style.display = 'flex';
    document.getElementById('categoryName').focus();
}

function hideCreateCategoryModal() {
    document.getElementById('createCategoryModal').style.display = 'none';
    document.getElementById('createCategoryForm').reset();
    
    // Reset character counters
    updateCharCounters();
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('createCategoryModal');
    if (event.target === modal) {
        hideCreateCategoryModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideCreateCategoryModal();
    }
});

// Form validation
document.getElementById('createCategoryForm').addEventListener('submit', function(e) {
    const name = document.getElementById('categoryName').value.trim();
    
    if (!name) {
        e.preventDefault();
        ForumUtils.showNotification('Bitte geben Sie einen Kategorienamen ein.', 'error');
        return;
    }
    
    if (name.length > 100) {
        e.preventDefault();
        ForumUtils.showNotification('Der Kategoriename darf maximal 100 Zeichen lang sein.', 'error');
        return;
    }
    
    const description = document.getElementById('categoryDescription').value.trim();
    if (description.length > 500) {
        e.preventDefault();
        ForumUtils.showNotification('Die Beschreibung darf maximal 500 Zeichen lang sein.', 'error');
        return;
    }
});

// Character counters
function updateCharCounters() {
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    
    updateCharCounter(nameInput, 100, 'Eindeutiger Name für die Kategorie');
    updateCharCounter(descInput, 500, 'Optionale Beschreibung');
}

function updateCharCounter(input, maxLength, defaultText) {
    const currentLength = input.value.length;
    const hint = input.nextElementSibling;
    
    if (currentLength > maxLength * 0.8) {
        hint.innerHTML = `Noch ${maxLength - currentLength} Zeichen übrig`;
        hint.style.color = currentLength >= maxLength ? 'var(--entropy-danger)' : 'var(--entropy-warning)';
    } else {
        hint.innerHTML = `${defaultText} (max. ${maxLength} Zeichen)`;
        hint.style.color = '';
    }
}

// Initialize character counters
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    
    nameInput.addEventListener('input', () => updateCharCounter(nameInput, 100, 'Eindeutiger Name für die Kategorie'));
    descInput.addEventListener('input', () => updateCharCounter(descInput, 500, 'Optionale Beschreibung'));
});