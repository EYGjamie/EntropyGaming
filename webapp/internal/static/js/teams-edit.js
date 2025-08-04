// webapp/internal/static/js/teams-edit.js
// Team Edit Page JavaScript - Entropy Gaming

// Global variables
let currentAction = null;
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
    
    // Modal close cleanup
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.addEventListener('hidden.bs.modal', function() {
            currentAction = null;
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
            setTimeout(() => {
                updatePageTitle(newName);
                updateBreadcrumb(newName);
            }, 1000);
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error changing team name:', error);
    });
}

// Validate team name
function validateTeamName(name) {
    if (!name || name.length < 2 || name.length > 50) {
        return false;
    }
    
    // Additional validation patterns
    const invalidChars = /[<>:"\/\\|?*]/;
    if (invalidChars.test(name)) {
        return false;
    }
    
    return true;
}

// Update member role
function updateMemberRole(userId, newRole) {
    if (!userId || !newRole) {
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
            updateMemberRoleInUI(userId, newRole);
        } else {
            resetMemberRoleSelect(userId);
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error updating member role:', error);
        resetMemberRoleSelect(userId);
    });
}

// Remove member with confirmation
function removeMember(userId, memberName) {
    if (!userId || !memberName) {
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
            removeMemberFromUI(userId);
            updateMemberCount();
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error removing member:', error);
    });
}

// Handle confirm button click
function handleConfirmAction() {
    if (currentAction && typeof currentAction === 'function') {
        currentAction();
        currentAction = null;
    }
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

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Expose global functions for inline event handlers
window.updateMemberRole = updateMemberRole;
window.removeMember = removeMember;