/* webapp/internal/static/js/global.js */
/* Globales JavaScript für die Flask MVP Anwendung */

// ===== GLOBAL VARIABLES =====
window.EntropyApp = {
    config: {
        searchDelay: 300,
        animationDuration: 300
    },
    cache: new Map(),
    utils: {}
};

// ===== UTILITY FUNCTIONS =====
EntropyApp.utils = {
    // Debounce function for search inputs
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format timestamps
    formatTimestamp: function(timestamp) {
        if (!timestamp) return 'Unbekannt';
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return timestamp;
        }
    },

    // Show loading spinner
    showLoading: function(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Lade...</span>
                    </div>
                </div>
            `;
        }
    },

    // Show error message
    showError: function(element, message) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    ${message || 'Ein Fehler ist aufgetreten.'}
                </div>
            `;
        }
    },

    // API request wrapper
    apiRequest: async function(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
};

// ===== TICKET SEARCH FUNCTIONALITY =====
window.ticketSearchModal = null;
window.ticketSearchTimeout = null;

function showTicketSearchModal() {
    const modal = document.getElementById('ticketSearchModal');
    if (modal) {
        window.ticketSearchModal = new bootstrap.Modal(modal);
        window.ticketSearchModal.show();
        
        // Focus on input after modal is shown
        modal.addEventListener('shown.bs.modal', function() {
            const input = document.getElementById('ticketSearchInput');
            if (input) {
                input.focus();
                input.addEventListener('input', handleTicketSearchInput);
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        performTicketSearch();
                    }
                });
            }
        });
    }
}

function handleTicketSearchInput() {
    const input = document.getElementById('ticketSearchInput');
    const query = input.value.trim();
    
    // Clear previous timeout
    if (window.ticketSearchTimeout) {
        clearTimeout(window.ticketSearchTimeout);
    }
    
    if (query.length < 2) {
        hideTicketSearchResults();
        return;
    }
    
    // Debounced search
    window.ticketSearchTimeout = setTimeout(() => {
        performTicketSearch(query);
    }, EntropyApp.config.searchDelay);
}

async function performTicketSearch(query = null) {
    const input = document.getElementById('ticketSearchInput');
    const resultsContainer = document.getElementById('ticketSearchResults');
    const resultsList = document.getElementById('ticketSearchResultsList');
    
    if (!query) {
        query = input.value.trim();
    }
    
    if (query.length < 1) {
        hideTicketSearchResults();
        return;
    }
    
    // Show loading
    resultsContainer.classList.remove('d-none');
    EntropyApp.utils.showLoading(resultsList);
    
    try {
        const data = await EntropyApp.utils.apiRequest(`/tickets/api/search?q=${encodeURIComponent(query)}&limit=5`);
        
        if (data.success && data.data.length > 0) {
            displayTicketSearchResults(data.data);
        } else {
            resultsList.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle"></i>
                    Keine Tickets gefunden für "${query}".
                </div>
            `;
        }
    } catch (error) {
        console.error('Ticket search error:', error);
        EntropyApp.utils.showError(resultsList, 'Fehler bei der Ticket-Suche.');
    }
}

function displayTicketSearchResults(tickets) {
    const resultsList = document.getElementById('ticketSearchResultsList');
    
    const resultsHTML = tickets.map(ticket => `
        <a href="/tickets/${ticket.ticket_id}" class="list-group-item list-group-item-action">
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">Ticket #${ticket.ticket_id}</h6>
                <small class="text">${ticket.ticket_status || 'Unbekannt'}</small>
            </div>
            <p class="mb-1">${ticket.ticket_modal_field_one || 'Kein Titel'}</p>
            <small class="text">
                Ersteller: ${ticket.ticket_ersteller_name || 'Unbekannt'}
                ${ticket.ticket_bereich ? ' | Bereich: ' + ticket.ticket_bereich : ''}
            </small>
        </a>
    `).join('');
    
    resultsList.innerHTML = resultsHTML;
}

function hideTicketSearchResults() {
    const resultsContainer = document.getElementById('ticketSearchResults');
    if (resultsContainer) {
        resultsContainer.classList.add('d-none');
    }
}

// ===== BOT CONFIG MODAL =====
window.botConfigModal = null;

function showBotConfigModal() {
    const modal = document.getElementById('botConfigModal');
    if (modal) {
        window.botConfigModal = new bootstrap.Modal(modal);
        window.botConfigModal.show();
        
        // Load bot config data
        loadBotConfig();
    }
}

async function loadBotConfig() {
    const contentDiv = document.getElementById('botConfigContent');
    
    EntropyApp.utils.showLoading(contentDiv);
    
    try {
        const data = await EntropyApp.utils.apiRequest('/api/bot-config');
        
        if (data.success) {
            displayBotConfig(data.data);
        } else {
            EntropyApp.utils.showError(contentDiv, 'Bot-Konfiguration konnte nicht geladen werden.');
        }
    } catch (error) {
        console.error('Bot config load error:', error);
        EntropyApp.utils.showError(contentDiv, 'Fehler beim Laden der Bot-Konfiguration.');
    }
}

function displayBotConfig(config) {
    const contentDiv = document.getElementById('botConfigContent');
    
    const configHTML = `
        <div class="accordion" id="botConfigAccordion">
            ${Object.entries(config).map(([key, value], index) => `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading${index}">
                        <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" 
                                type="button" data-bs-toggle="collapse" 
                                data-bs-target="#collapse${index}">
                            ${key}
                        </button>
                    </h2>
                    <div id="collapse${index}" 
                         class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                         data-bs-parent="#botConfigAccordion">
                        <div class="accordion-body">
                            <pre class="bg-light p-3 rounded"><code>${JSON.stringify(value, null, 2)}</code></pre>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    contentDiv.innerHTML = configHTML;
}

// ===== STATISTICS UPDATE =====
async function updateDashboardStats() {
    const statsElements = document.querySelectorAll('[data-stat-key]');
    
    if (statsElements.length === 0) return;
    
    try {
        const data = await EntropyApp.utils.apiRequest('/api/dashboard-stats');
        
        if (data.success) {
            statsElements.forEach(element => {
                const statKey = element.dataset.statKey;
                if (data.data[statKey] !== undefined) {
                    element.textContent = data.data[statKey];
                    
                    // Add animation
                    element.classList.add('fade-in-up');
                }
            });
        }
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// ===== THEME TOGGLE =====
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        }
    });
}

// ===== FORM ENHANCEMENTS =====
function initFormEnhancements() {
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea[data-auto-resize]');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
    
    // Form validation feedback
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initThemeToggle();
    initFormEnhancements();
    
    // Update stats if on dashboard
    if (document.body.dataset.page === 'dashboard') {
        updateDashboardStats();
        // Auto-refresh stats every 5 minutes
        setInterval(updateDashboardStats, 300000);
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Staggered animations
    const animatedElements = document.querySelectorAll('.fade-in-up');
    animatedElements.forEach((element, index) => {
        element.style.setProperty('--animation-delay', `${index * 0.1}s`);
        element.classList.add('staggered-animation');
    });
});

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Show user-friendly error message for critical errors
    if (e.error && e.error.message && !e.error.message.includes('Script error')) {
        const errorToast = document.createElement('div');
        errorToast.className = 'toast position-fixed top-0 end-0 m-3';
        errorToast.innerHTML = `
            <div class="toast-header bg-danger text-white">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong class="me-auto">Fehler</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
            </div>
        `;
        
        document.body.appendChild(errorToast);
        const toast = new bootstrap.Toast(errorToast);
        toast.show();
        
        // Remove toast element after it's hidden
        errorToast.addEventListener('hidden.bs.toast', function() {
            errorToast.remove();
        });
    }
});

// ===== EXPORT FOR MODULES =====
window.EntropyApp.showTicketSearchModal = showTicketSearchModal;
window.EntropyApp.showBotConfigModal = showBotConfigModal;
window.EntropyApp.updateDashboardStats = updateDashboardStats;