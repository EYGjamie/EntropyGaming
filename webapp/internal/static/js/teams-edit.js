// webapp/internal/static/js/teams-edit.js
// Team Edit Page JavaScript - Entropy Gaming

// Global variables
let currentAction = null;
let deleteTeamData = null;
const TEAM_ID = window.location.pathname.split('/').filter(Boolean).pop();

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

// Initialize all event listeners
function initializeEventListeners() {
    // Team name form submission
    const teamNameForm = document.getElementById('teamNameForm');
    if (teamNameForm) {
        teamNameForm.addEventListener('submit', handleTeamNameSubmit);
    }
    
    // Confirm button handler
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmAction);
    }
    
    // Delete team confirm button handler
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteTeamConfirm);
    }
    
    // Delete confirmation input validation
    const deleteConfirmInput = document.getElementById('deleteConfirmInput');
    const deleteUnderstandCheck = document.getElementById('deleteUnderstandCheck');
    if (deleteConfirmInput && deleteUnderstandCheck) {
        deleteConfirmInput.addEventListener('input', validateDeleteForm);
        deleteUnderstandCheck.addEventListener('change', validateDeleteForm);
    }
    
    // Modal close cleanup
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.addEventListener('hidden.bs.modal', function() {
            currentAction = null;
        });
    }
    
    const deleteTeamModal = document.getElementById('deleteTeamModal');
    if (deleteTeamModal) {
        deleteTeamModal.addEventListener('hidden.bs.modal', function() {
            resetDeleteForm();
        });
    }
}

// Handle team name form submission
function handleTeamNameSubmit(e) {
    e.preventDefault();
    
    const newName = document.getElementById('teamName').value.trim();
    
    if (!validateTeamName(newName)) {
        return;
    }
    
    showLoading(true);
    
    fetch(`/teams/api/edit/${TEAM_ID}/change_name`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: newName
        })
    })
    .then(handleApiResponse)
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showAlert('Erfolg', data.message, 'success');
            // Update page title and breadcrumb after delay
            setTimeout(() => {
                updatePageTitle(newName);
                updateBreadcrumb(newName);
            }, 1000);
        } else {
            showAlert('Fehler', data.error, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error changing team name:', error);
        showAlert('Fehler', 'Unerwarteter Fehler beim Ändern des Team-Namens.', 'error');
    });
}

// Validate team name
function validateTeamName(name) {
    if (!name || name.length < 2 || name.length > 50) {
        showAlert('Fehler', 'Team-Name muss zwischen 2 und 50 Zeichen lang sein.', 'error');
        return false;
    }
    
    // Additional validation patterns
    const invalidChars = /[<>:"\/\\|?*]/;
    if (invalidChars.test(name)) {
        showAlert('Fehler', 'Team-Name enthält ungültige Zeichen.', 'error');
        return false;
    }
    
    return true;
}

// Update member role
function updateMemberRole(userId, newRole) {
    if (!userId || !newRole) {
        showAlert('Fehler', 'Ungültige Parameter für Rollenänderung.', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch(`/teams/api/edit/${TEAM_ID}/update_member_role`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            role: newRole
        })
    })
    .then(handleApiResponse)
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showAlert('Erfolg', data.message, 'success');
            // Update the role in the UI
            updateMemberRoleInUI(userId, newRole);
        } else {
            showAlert('Fehler', data.error, 'error');
            // Reset select to previous value
            resetMemberRoleSelect(userId);
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error updating member role:', error);
        showAlert('Fehler', 'Unerwarteter Fehler beim Aktualisieren der Rolle.', 'error');
        resetMemberRoleSelect(userId);
    });
}

// Remove member with confirmation
function removeMember(userId, memberName) {
    if (!userId || !memberName) {
        showAlert('Fehler', 'Ungültige Parameter für Mitglied-Entfernung.', 'error');
        return;
    }
    
    const confirmMessage = `Möchten Sie "${memberName}" wirklich aus dem Team entfernen?\n\nDiese Aktion kann nicht rückgängig gemacht werden und entfernt das Mitglied auch aus Discord.`;
    
    document.getElementById('confirmMessage').textContent = confirmMessage;
    
    currentAction = () => executeRemoveMember(userId, memberName);
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
}

// Execute member removal
function executeRemoveMember(userId, memberName) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
    modal.hide();
    
    showLoading(true);
    
    fetch(`/teams/api/edit/${TEAM_ID}/remove_member`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId
        })
    })
    .then(handleApiResponse)
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showAlert('Erfolg', data.message, 'success');
            // Remove member card from UI
            removeMemberFromUI(userId);
            updateMemberCount();
        } else {
            showAlert('Fehler', data.error, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error removing member:', error);
        showAlert('Fehler', 'Unerwarteter Fehler beim Entfernen des Mitglieds.', 'error');
    });
}

// Handle confirm button click
function handleConfirmAction() {
    if (currentAction && typeof currentAction === 'function') {
        currentAction();
        currentAction = null;
    }
}

// ===== TEAM DELETE FUNCTIONALITY =====

// Initialize team deletion process
function deleteTeam(teamName, categoryId) {
    if (!teamName || !categoryId) {
        showAlert('Fehler', 'Ungültige Team-Daten für Löschung.', 'error');
        return;
    }
    
    // Store delete data globally
    deleteTeamData = {
        name: teamName,
        categoryId: categoryId
    };
    
    // Update modal content
    document.getElementById('deleteTeamName').textContent = teamName;
    document.getElementById('deleteTeamNameConfirm').textContent = teamName;
    
    // Show delete modal
    const modal = new bootstrap.Modal(document.getElementById('deleteTeamModal'));
    modal.show();
}

// Validate delete form inputs
function validateDeleteForm() {
    const nameInput = document.getElementById('deleteConfirmInput');
    const understandCheck = document.getElementById('deleteUnderstandCheck');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!nameInput || !understandCheck || !confirmBtn || !deleteTeamData) {
        return;
    }
    
    const nameMatches = nameInput.value.trim() === deleteTeamData.name;
    const understoodChecked = understandCheck.checked;
    
    // Enable button only if both conditions are met
    confirmBtn.disabled = !(nameMatches && understoodChecked);
    
    // Visual feedback for name input
    if (nameInput.value.trim() === '') {
        nameInput.classList.remove('is-valid', 'is-invalid');
    } else if (nameMatches) {
        nameInput.classList.remove('is-invalid');
        nameInput.classList.add('is-valid');
    } else {
        nameInput.classList.remove('is-valid');
        nameInput.classList.add('is-invalid');
    }
}

// Handle delete team confirmation
function handleDeleteTeamConfirm() {
    if (!deleteTeamData) {
        showAlert('Fehler', 'Keine Team-Daten für Löschung verfügbar.', 'error');
        return;
    }
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTeamModal'));
    modal.hide();
    
    // Execute deletion
    executeTeamDeletion();
}

// Execute team deletion via API
function executeTeamDeletion() {
    if (!deleteTeamData) {
        showAlert('Fehler', 'Keine Team-Daten verfügbar.', 'error');
        return;
    }
    
    showLoading(true);
    
    // First call Flask API which will call Discord Bot
    fetch(`/teams/api/edit/${TEAM_ID}/delete_team`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            category_id: deleteTeamData.categoryId,
            team_name: deleteTeamData.name
        })
    })
    .then(handleApiResponse)
    .then(data => {
        showLoading(false);
        
        if (data.success) {
            showAlert('Erfolg', `Team "${deleteTeamData.name}" wurde erfolgreich gelöscht.`, 'success');
            
            // Redirect to teams overview after delay
            setTimeout(() => {
                window.location.href = '/teams';
            }, 2000);
        } else {
            showAlert('Fehler', data.error || 'Fehler beim Löschen des Teams.', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error deleting team:', error);
        showAlert('Fehler', 'Unerwarteter Fehler beim Löschen des Teams.', 'error');
    });
}

// Reset delete form
function resetDeleteForm() {
    const nameInput = document.getElementById('deleteConfirmInput');
    const understandCheck = document.getElementById('deleteUnderstandCheck');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (nameInput) {
        nameInput.value = '';
        nameInput.classList.remove('is-valid', 'is-invalid');
    }
    
    if (understandCheck) {
        understandCheck.checked = false;
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
    
    deleteTeamData = null;
}

// Handle API responses
function handleApiResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// UI Update Functions
function updateMemberRoleInUI(userId, newRole) {
    const memberCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (memberCard) {
        const select = memberCard.querySelector('.role-selector');
        if (select) {
            select.value = newRole;
        }
    }
}

function resetMemberRoleSelect(userId) {
    const memberCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (memberCard) {
        const select = memberCard.querySelector('.role-selector');
        if (select) {
            // Reset to previously selected value
            const selectedOption = select.querySelector('option[selected]');
            if (selectedOption) {
                select.value = selectedOption.value;
            }
        }
    }
}

function removeMemberFromUI(userId) {
    const memberCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (memberCard) {
        // Add fade out animation
        memberCard.style.transition = 'all 0.3s ease';
        memberCard.style.opacity = '0';
        memberCard.style.transform = 'translateX(-100%)';
        
        // Remove after animation
        setTimeout(() => {
            memberCard.remove();
            // Show empty state if no members left
            checkAndShowEmptyState();
        }, 300);
    }
}

function updateMemberCount() {
    const memberCards = document.querySelectorAll('.member-edit-card');
    const countBadge = document.querySelector('.edit-section-header .badge');
    if (countBadge) {
        countBadge.textContent = memberCards.length;
    }
}

function checkAndShowEmptyState() {
    const membersContainer = document.getElementById('membersContainer');
    const memberCards = document.querySelectorAll('.member-edit-card');
    
    if (memberCards.length === 0 && membersContainer) {
        membersContainer.innerHTML = `
            <div class="empty-members-state">
                <i class="bi bi-people empty-icon"></i>
                <h5 class="empty-title">Keine Mitglieder</h5>
                <p class="empty-description">Dieses Team hat derzeit keine Mitglieder.</p>
            </div>
        `;
    }
}

function updatePageTitle(newName) {
    document.title = `${newName} bearbeiten - Teams`;
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        pageHeader.innerHTML = `<i class="bi bi-pencil-square"></i> Team bearbeiten`;
    }
    const pageDescription = document.querySelector('.page-header p strong');
    if (pageDescription) {
        pageDescription.textContent = newName;
    }
}

function updateBreadcrumb(newName) {
    const teamBreadcrumb = document.querySelector('.breadcrumb-item:nth-last-child(2) a');
    if (teamBreadcrumb) {
        teamBreadcrumb.textContent = newName;
    }
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'block' : 'none';
        
        // Prevent body scroll when loading
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

function showAlert(title, message, type) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.entropy-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toastClass = type === 'success' ? 'entropy-toast-success' : 'entropy-toast-error';
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
    const iconColor = type === 'success' ? '#10b981' : '#ef4444';
    
    const toastHtml = `
        <div class="entropy-toast ${toastClass}" role="alert">
            <div class="entropy-toast-header">
                <i class="bi ${icon}" style="color: ${iconColor};"></i>
                <strong class="entropy-toast-title">${title}</strong>
                <button type="button" class="entropy-toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="entropy-toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'entropy-toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Get the newly added toast
    const newToast = toastContainer.lastElementChild;
    
    // Trigger animation
    setTimeout(() => {
        newToast.classList.add('entropy-toast-show');
    }, 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (newToast && newToast.parentNode) {
            newToast.classList.remove('entropy-toast-show');
            newToast.classList.add('entropy-toast-hide');
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (newToast && newToast.parentNode) {
                    newToast.remove();
                }
            }, 300);
        }
    }, 4000);
    
    // Add click to dismiss functionality
    newToast.addEventListener('click', function() {
        this.classList.remove('entropy-toast-show');
        this.classList.add('entropy-toast-hide');
        setTimeout(() => {
            if (this && this.parentNode) {
                this.remove();
            }
        }, 300);
    });
}

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showAlert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    showAlert('Fehler', 'Ein Netzwerkfehler ist aufgetreten.', 'error');
});

// Expose global functions for inline event handlers
window.updateMemberRole = updateMemberRole;
window.removeMember = removeMember;
window.deleteTeam = deleteTeam;