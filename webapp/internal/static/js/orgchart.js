/**
 * Organigramm JavaScript für Entropy Gaming Flask App
 * Mit verbesserter Club Leitung Logik
 */

let orgData = [];
let expandedNodes = new Set();
let clubLeitungExpanded = null; // Track welche Club Leitung ausgeklappt ist

// Club Leitung IDs
const CLUB_LEITUNG_IDS = [10, 11, 12]; // Eric, Mini, Mella

function initOrgChart(data) {
    orgData = data;
    renderOrgChart();
}

function getPersonClass(person) {
    if (person.position === "CEO") return "ceo";
    if (person.position === "Projektleitung") return "projektleitung";
    if (person.position === "Club Leitung") return "clubleitung";
    return "management";
}

function hasChildren(personId) {
    return orgData.some(person => person.parentIds.includes(personId));
}

function getChildren(personId) {
    return orgData.filter(person => person.parentIds.includes(personId));
}

function isClubLeitung(personId) {
    return CLUB_LEITUNG_IDS.includes(personId);
}

function shouldDisableClubLeitung(personId) {
    return isClubLeitung(personId) && 
           clubLeitungExpanded !== null && 
           clubLeitungExpanded !== personId;
}

function createPersonCard(person) {
    const hasChildNodes = hasChildren(person.id);
    const isExpanded = expandedNodes.has(person.id);
    const isDisabled = shouldDisableClubLeitung(person.id);
    
    let classes = `person-card ${getPersonClass(person)}`;
    if (hasChildNodes && !isDisabled) classes += ' expandable';
    if (hasChildNodes && !isExpanded) classes += ' collapsed';
    if (isDisabled) classes += ' disabled';
    
    const clickHandler = isDisabled ? '' : `onclick="togglePerson(${person.id})"`;
    
    return `
        <div class="${classes}" 
             data-id="${person.id}" ${clickHandler}>
            <div class="person-name">${person.name}</div>
            <div class="person-position">${person.position}</div>
            <div class="person-specific">${person.specific || ''}</div>
        </div>
    `;
}

function renderLevel(parentIds, level) {
    const people = orgData.filter(person => 
        parentIds.length === 0 ? 
        person.parentIds.length === 0 : 
        person.parentIds.some(id => parentIds.includes(id))
    );

    if (people.length === 0) return '';

    let html = `<div class="org-level level-${level}">`;
    people.forEach(person => {
        html += createPersonCard(person);
    });
    html += '</div>';

    // Render children for expanded nodes
    people.forEach(person => {
        if (hasChildren(person.id) && expandedNodes.has(person.id)) {
            html += `<div class="children expanded" data-parent="${person.id}">`;
            html += renderLevel([person.id], level + 1);
            html += '</div>';
        }
    });

    return html;
}

function renderOrgChart() {
    const container = document.getElementById('orgchart');
    if (!container) return;
    
    container.innerHTML = renderLevel([], 1);
    
    // Verbindungslinien entfernt für sauberes Design
}

function addConnectionLines() {
    // Verbindungslinien entfernt - sauberes Design ohne Linien
    return;
}

// Verbindungslinien-Funktion entfernt für sauberes Design

function togglePerson(personId) {
    if (!hasChildren(personId)) return;
    
    // Club Leitung Logik
    if (isClubLeitung(personId)) {
        if (clubLeitungExpanded === personId) {
            // Gleiche Club Leitung - einklappen
            expandedNodes.delete(personId);
            clubLeitungExpanded = null;
        } else if (clubLeitungExpanded === null) {
            // Keine Club Leitung ausgeklappt - ausklappen
            expandedNodes.add(personId);
            clubLeitungExpanded = personId;
        }
        // Wenn andere Club Leitung ausgeklappt ist, nichts tun (disabled)
    } else {
        // Normale Toggle Logik für andere Positionen
        if (expandedNodes.has(personId)) {
            expandedNodes.delete(personId);
        } else {
            expandedNodes.add(personId);
        }
    }
    
    renderOrgChart();
}

function expandAll() {
    orgData.forEach(person => {
        if (hasChildren(person.id)) {
            if (!isClubLeitung(person.id)) {
                expandedNodes.add(person.id);
            }
        }
    });
    
    // Nur erste Club Leitung ausklappen
    if (clubLeitungExpanded === null) {
        expandedNodes.add(CLUB_LEITUNG_IDS[0]);
        clubLeitungExpanded = CLUB_LEITUNG_IDS[0];
    }
    
    renderOrgChart();
}

function collapseAll() {
    expandedNodes.clear();
    clubLeitungExpanded = null;
    renderOrgChart();
}

function createDefaultOrgchart() {
    fetch('/api/orgchart-create-default', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('Fehler beim Erstellen des Organigramms: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Fehler beim Erstellen des Organigramms');
    });
}

// Window resize handler - keine Verbindungslinien mehr nötig
window.addEventListener('resize', function() {
    // Responsive Anpassungen bei Bedarf
});