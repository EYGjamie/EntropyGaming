/* webapp/internal/static/js/orgchart.js */

/**
 * Modern Orgchart Implementation for Entropy Gaming
 * Supports flat JSON structure with parentIds
 */

window.OrgChart = (function() {
    'use strict';
    
    let orgData = null;
    let flatData = [];
    let hierarchicalData = null;
    let currentPersonModal = null;
    let isCompactView = false;
    let highlightedNodes = new Set();
    
    // Configuration
    const config = {
        maxLevel: 10,
        animationDuration: 300,
        autoExpandLevel: 2,
        enableTooltips: true,
        enableModal: true
    };
    
    /**
     * Initialize the orgchart
     */
    function init(data) {
        console.log('Initializing OrgChart with data:', data);
        
        orgData = data;
        
        if (Array.isArray(data)) {
            // Direct flat array
            flatData = data;
            hierarchicalData = convertFlatToHierarchical(data);
        } else if (data.structure && Array.isArray(data.structure)) {
            // Wrapped flat array
            flatData = data.structure;
            hierarchicalData = convertFlatToHierarchical(data.structure);
        } else if (data.structure) {
            // Already hierarchical
            hierarchicalData = data.structure;
            flatData = convertHierarchicalToFlat(data.structure);
        } else {
            console.error('Invalid orgchart data format');
            return;
        }
        
        render();
        setupEventListeners();
        
        if (config.enableTooltips) {
            initializeTooltips();
        }
    }
    
    /**
     * Convert flat data structure to hierarchical
     */
    function convertFlatToHierarchical(flatData) {
        if (!Array.isArray(flatData) || flatData.length === 0) {
            return null;
        }
        
        // Create lookup map
        const nodesById = {};
        flatData.forEach(person => {
            nodesById[person.id] = {
                ...person,
                children: []
            };
        });
        
        // Build hierarchy
        const roots = [];
        
        flatData.forEach(person => {
            const node = nodesById[person.id];
            const parentIds = person.parentIds || [];
            
            if (parentIds.length === 0) {
                // Root node
                roots.push(node);
            } else {
                // Add to all parents
                parentIds.forEach(parentId => {
                    if (nodesById[parentId]) {
                        nodesById[parentId].children.push(node);
                    }
                });
            }
        });
        
        // Handle multiple roots
        if (roots.length > 1) {
            return {
                id: 'virtual-root',
                name: 'Entropy Gaming',
                position: 'Organisation',
                children: roots,
                isVirtual: true
            };
        } else if (roots.length === 1) {
            return roots[0];
        }
        
        return null;
    }
    
    /**
     * Convert hierarchical data to flat
     */
    function convertHierarchicalToFlat(hierarchicalData, result = []) {
        if (!hierarchicalData) return result;
        
        if (!hierarchicalData.isVirtual) {
            result.push({
                id: hierarchicalData.id,
                name: hierarchicalData.name,
                position: hierarchicalData.position
            });
        }
        
        if (hierarchicalData.children) {
            hierarchicalData.children.forEach(child => {
                convertHierarchicalToFlat(child, result);
            });
        }
        
        return result;
    }
    
    /**
     * Render the orgchart
     */
    function render() {
        const container = document.getElementById('orgchart');
        if (!container || !hierarchicalData) {
            console.error('Cannot render: missing container or data');
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create tree structure
        const treeElement = createTreeElement(hierarchicalData, 0);
        container.appendChild(treeElement);
        
        // Auto-expand to configured level
        expandToLevel(config.autoExpandLevel);
        
        console.log('OrgChart rendered successfully');
    }
    
    /**
     * Create tree element recursively
     */
    function createTreeElement(node, level) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'org-tree';
        
        // Create the current level
        const levelElement = document.createElement('div');
        levelElement.className = 'org-level';
        
        // Create node card
        const cardElement = createCardElement(node, level);
        levelElement.appendChild(cardElement);
        
        nodeElement.appendChild(levelElement);
        
        // Create children if they exist
        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'org-children';
            childrenContainer.id = `children-${node.id}`;
            
            // Group children by level if needed
            const childLevel = document.createElement('div');
            childLevel.className = 'org-level';
            
            node.children.forEach(child => {
                const childElement = createTreeElement(child, level + 1);
                childLevel.appendChild(childElement);
            });
            
            childrenContainer.appendChild(childLevel);
            nodeElement.appendChild(childrenContainer);
        }
        
        return nodeElement;
    }
    
    /**
     * Create card element for a person
     */
    function createCardElement(person, level) {
        const nodeContainer = document.createElement('div');
        nodeContainer.className = 'org-node';
        nodeContainer.setAttribute('data-level', level);
        nodeContainer.setAttribute('data-person-id', person.id);
        
        const card = document.createElement('div');
        card.className = `org-card level-${Math.min(level, 4)}`;
        card.setAttribute('data-person-id', person.id);
        card.setAttribute('tabindex', '0');
        
        // Add tooltip if enabled
        if (config.enableTooltips && !person.isVirtual) {
            card.setAttribute('data-bs-toggle', 'tooltip');
            card.setAttribute('data-bs-placement', 'top');
            card.setAttribute('title', `${person.name} - ${person.position}`);
        }
        
        // Create card content
        const title = document.createElement('div');
        title.className = 'org-title';
        title.textContent = person.name || 'Unbekannt';
        
        const subtitle = document.createElement('div');
        subtitle.className = 'org-subtitle';
        subtitle.textContent = person.position || '';
        
        card.appendChild(title);
        card.appendChild(subtitle);
        
        // Add statistics if available
        if (person.children && person.children.length > 0) {
            const stats = document.createElement('div');
            stats.className = 'org-stats';
            
            const subordinates = document.createElement('div');
            subordinates.className = 'stat-item';
            subordinates.innerHTML = `
                <i class="bi bi-people"></i>
                <span>${person.children.length}</span>
            `;
            
            stats.appendChild(subordinates);
            card.appendChild(stats);
            
            // Add toggle icon
            const toggleIcon = document.createElement('i');
            toggleIcon.className = 'bi bi-chevron-down toggle-icon';
            card.appendChild(toggleIcon);
        }
        
        // Add event listeners
        card.addEventListener('click', (e) => handleCardClick(e, person));
        card.addEventListener('keydown', (e) => handleCardKeydown(e, person));
        
        nodeContainer.appendChild(card);
        return nodeContainer;
    }
    
    /**
     * Handle card click events
     */
    function handleCardClick(event, person) {
        event.stopPropagation();
        
        if (event.ctrlKey || event.metaKey) {
            // Ctrl+Click: Show person details
            if (config.enableModal) {
                showPersonModal(person);
            }
        } else {
            // Regular click: Toggle children
            toggleNode(person.id);
        }
    }
    
    /**
     * Handle keyboard navigation
     */
    function handleCardKeydown(event, person) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                toggleNode(person.id);
                break;
            case 'i':
            case 'I':
                event.preventDefault();
                if (config.enableModal) {
                    showPersonModal(person);
                }
                break;
        }
    }
    
    /**
     * Toggle node expansion
     */
    function toggleNode(personId) {
        const childrenContainer = document.getElementById(`children-${personId}`);
        if (!childrenContainer) return;
        
        const isCollapsed = childrenContainer.classList.contains('collapsed');
        const card = document.querySelector(`[data-person-id="${personId}"]`);
        const toggleIcon = card?.querySelector('.toggle-icon');
        
        if (isCollapsed) {
            // Expand
            childrenContainer.classList.remove('collapsed');
            if (toggleIcon) {
                toggleIcon.classList.add('expanded');
            }
        } else {
            // Collapse
            childrenContainer.classList.add('collapsed');
            if (toggleIcon) {
                toggleIcon.classList.remove('expanded');
            }
        }
    }
    
    /**
     * Expand all nodes
     */
    function expandAll() {
        document.querySelectorAll('.org-children').forEach(container => {
            container.classList.remove('collapsed');
        });
        
        document.querySelectorAll('.toggle-icon').forEach(icon => {
            icon.classList.add('expanded');
        });
    }
    
    /**
     * Collapse all nodes
     */
    function collapseAll() {
        document.querySelectorAll('.org-children').forEach(container => {
            container.classList.add('collapsed');
        });
        
        document.querySelectorAll('.toggle-icon').forEach(icon => {
            icon.classList.remove('expanded');
        });
    }
    
    /**
     * Expand to specific level
     */
    function expandToLevel(maxLevel) {
        document.querySelectorAll('.org-children').forEach(container => {
            const parentNode = container.closest('.org-node');
            const level = parseInt(parentNode?.getAttribute('data-level') || '0');
            
            if (level < maxLevel) {
                container.classList.remove('collapsed');
                const card = parentNode?.querySelector('.org-card');
                const toggleIcon = card?.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.classList.add('expanded');
                }
            } else {
                container.classList.add('collapsed');
                const card = parentNode?.querySelector('.org-card');
                const toggleIcon = card?.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.classList.remove('expanded');
                }
            }
        });
    }
    
    /**
     * Center the view on the orgchart
     */
    function centerView() {
        const container = document.getElementById('orgchart');
        if (!container) return;
        
        const firstCard = container.querySelector('.org-card.level-0');
        if (firstCard) {
            firstCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }
    
    /**
     * Toggle compact view
     */
    function toggleCompactView() {
        const container = document.getElementById('orgchart');
        if (!container) return;
        
        isCompactView = !isCompactView;
        
        if (isCompactView) {
            container.classList.add('compact');
        } else {
            container.classList.remove('compact');
        }
    }
    
    /**
     * Highlight specific person
     */
    function highlightPerson(personId) {
        clearHighlights();
        
        const card = document.querySelector(`[data-person-id="${personId}"]`);
        if (card) {
            card.classList.add('highlighted');
            highlightedNodes.add(personId);
            
            // Scroll to highlighted person
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
            
            // Expand path to this person
            expandPathToPerson(personId);
        }
    }
    
    /**
     * Clear all highlights
     */
    function clearHighlights() {
        document.querySelectorAll('.org-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });
        highlightedNodes.clear();
    }
    
    /**
     * Expand path to specific person
     */
    function expandPathToPerson(personId) {
        const person = flatData.find(p => p.id === personId);
        if (!person) return;
        
        // Find all parent IDs recursively
        const pathIds = new Set([personId]);
        const findParents = (id) => {
            const current = flatData.find(p => p.id === id);
            if (current && current.parentIds) {
                current.parentIds.forEach(parentId => {
                    if (!pathIds.has(parentId)) {
                        pathIds.add(parentId);
                        findParents(parentId);
                    }
                });
            }
        };
        
        if (person.parentIds) {
            person.parentIds.forEach(findParents);
        }
        
        // Expand all nodes in the path
        pathIds.forEach(id => {
            const childrenContainer = document.getElementById(`children-${id}`);
            if (childrenContainer) {
                childrenContainer.classList.remove('collapsed');
                const card = document.querySelector(`[data-person-id="${id}"]`);
                const toggleIcon = card?.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.classList.add('expanded');
                }
            }
        });
    }
    
    /**
     * Show person details modal
     */
    function showPersonModal(person) {
        const modal = document.getElementById('personModal');
        if (!modal) return;
        
        // Populate modal content
        document.getElementById('modal-person-name').textContent = person.name || 'Unbekannt';
        document.getElementById('modal-person-position').textContent = person.position || 'Keine Position';
        
        // Calculate level
        const level = calculatePersonLevel(person.id);
        document.getElementById('modal-person-level').textContent = level > 0 ? `Ebene ${level}` : 'Führungsebene';
        
        // Get subordinates
        const subordinates = getDirectSubordinates(person.id);
        const subordinatesElement = document.getElementById('modal-person-subordinates');
        if (subordinates.length > 0) {
            subordinatesElement.innerHTML = subordinates.map(sub => 
                `<span class="badge bg-primary me-1">${sub.name}</span>`
            ).join('');
        } else {
            subordinatesElement.textContent = 'Keine';
        }
        
        // Get supervisors
        const supervisors = getDirectSupervisors(person.id);
        const supervisorsElement = document.getElementById('modal-person-supervisors');
        if (supervisors.length > 0) {
            supervisorsElement.innerHTML = supervisors.map(sup => 
                `<span class="badge bg-success me-1">${sup.name}</span>`
            ).join('');
        } else {
            supervisorsElement.textContent = 'Keine';
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        currentPersonModal = bootstrapModal;
    }
    
    /**
     * Calculate person's level in hierarchy
     */
    function calculatePersonLevel(personId, visited = new Set()) {
        if (visited.has(personId)) return 0; // Prevent infinite loops
        visited.add(personId);
        
        const person = flatData.find(p => p.id === personId);
        if (!person || !person.parentIds || person.parentIds.length === 0) {
            return 0; // Root level
        }
        
        // Find the minimum level among parents
        const parentLevels = person.parentIds.map(parentId => 
            calculatePersonLevel(parentId, new Set(visited))
        );
        
        return Math.min(...parentLevels) + 1;
    }
    
    /**
     * Get direct subordinates
     */
    function getDirectSubordinates(personId) {
        return flatData.filter(person => 
            person.parentIds && person.parentIds.includes(personId)
        );
    }
    
    /**
     * Get direct supervisors
     */
    function getDirectSupervisors(personId) {
        const person = flatData.find(p => p.id === personId);
        if (!person || !person.parentIds) return [];
        
        return person.parentIds.map(parentId => 
            flatData.find(p => p.id === parentId)
        ).filter(Boolean);
    }
    
    /**
     * Setup global event listeners
     */
    function setupEventListeners() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (currentPersonModal && !e.target.closest('.modal-content')) {
                currentPersonModal.hide();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return; // Don't interfere with input fields
            
            switch (e.key.toLowerCase()) {
                case 'e':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        expandAll();
                    }
                    break;
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        collapseAll();
                    }
                    break;
                case 'home':
                    e.preventDefault();
                    centerView();
                    break;
                case 'escape':
                    clearHighlights();
                    break;
            }
        });
    }
    
    /**
     * Initialize tooltips
     */
    function initializeTooltips() {
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }
    
    // Public API
    return {
        init,
        expandAll,
        collapseAll,
        centerView,
        toggleCompactView,
        highlightPerson,
        clearHighlights,
        render
    };
})();

// Legacy functions for backwards compatibility
function expandAll() {
    OrgChart.expandAll();
}

function collapseAll() {
    OrgChart.collapseAll();
}

function toggleNode(element) {
    if (element && element.dataset.personId) {
        OrgChart.toggleNode(element.dataset.personId);
    }
}