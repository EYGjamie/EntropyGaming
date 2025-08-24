// Kalender JavaScript - Entropy Gaming
class Calendar {
    constructor() {
        this.currentView = 'month';
        this.currentDate = new Date();
        this.events = [];
        this.selectedDate = null;
    }
    
    static init(initialEvents, year, month) {
        const calendar = new Calendar();
        calendar.events = initialEvents || [];
        calendar.currentDate = new Date(year, month - 1, 1);
        calendar.renderEvents();
        calendar.bindEvents();
        return calendar;
    }
    
    renderEvents() {
        // Events in der Monatsansicht rendern
        this.events.forEach(event => {
            this.renderEventInMonth(event);
        });
        
        // Mobile Event Liste aktualisieren
        this.updateMobileEventsList();
    }
    
    renderEventInMonth(event) {
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        
        // Für jeden Tag des Events
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = this.formatDateForId(date);
            const dayElement = document.getElementById(`events-${dateStr}`);
            
            if (dayElement) {
                const eventElement = this.createEventElement(event, date, startDate, endDate);
                dayElement.appendChild(eventElement);
            }
        }
    }
    
    createEventElement(event, currentDate, startDate, endDate) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event-item type-${event.event_type}`;
        eventDiv.style.backgroundColor = event.color;
        eventDiv.textContent = event.title;
        eventDiv.dataset.eventId = event.id;
        
        // Multi-day event styling
        if (startDate.getTime() !== endDate.getTime()) {
            eventDiv.classList.add('multi-day');
            if (currentDate.getTime() === startDate.getTime()) {
                eventDiv.classList.add('event-start');
            }
            if (currentDate.getTime() === endDate.getTime()) {
                eventDiv.classList.add('event-end');
            }
        }
        
        // All-day event styling
        if (event.all_day) {
            eventDiv.classList.add('all-day');
        }
        
        // Event click handler
        eventDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showEventDetails(event.id);
        });
        
        return eventDiv;
    }
    
    formatDateForId(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    updateMobileEventsList() {
        const mobileList = document.getElementById('mobileEventsList');
        if (!mobileList) return;
        
        mobileList.innerHTML = '';
        
        // Events für den aktuellen Monat filtern
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        const monthEvents = this.events.filter(event => {
            const eventDate = new Date(event.start_date);
            return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        });
        
        monthEvents.forEach(event => {
            const eventElement = this.createMobileEventElement(event);
            mobileList.appendChild(eventElement);
        });
        
        if (monthEvents.length === 0) {
            mobileList.innerHTML = '<p class="text-muted">Keine Events in diesem Monat</p>';
        }
    }
    
    createMobileEventElement(event) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'mobile-event-item';
        eventDiv.style.borderLeftColor = event.color;
        
        const dateStr = this.formatDisplayDate(event.start_date, event.end_date);
        const timeStr = this.formatDisplayTime(event);
        
        eventDiv.innerHTML = `
            <div class="mobile-event-date">${dateStr}</div>
            <div class="mobile-event-title">${event.title}</div>
            <div class="mobile-event-time">${timeStr}</div>
        `;
        
        eventDiv.addEventListener('click', () => {
            this.showEventDetails(event.id);
        });
        
        return eventDiv;
    }
    
    formatDisplayDate(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        
        if (startDate === endDate) {
            return start.toLocaleDateString('de-DE', options);
        } else {
            return `${start.toLocaleDateString('de-DE', options)} - ${end.toLocaleDateString('de-DE', options)}`;
        }
    }
    
    formatDisplayTime(event) {
        if (event.all_day) {
            return 'Ganztägig';
        }
        
        let timeStr = '';
        if (event.start_time) {
            timeStr += event.start_time;
        }
        if (event.end_time && event.end_time !== event.start_time) {
            timeStr += ` - ${event.end_time}`;
        }
        
        return timeStr || 'Ganztägig';
    }
    
    bindEvents() {
        // View Toggle Buttons
        const viewButtons = document.querySelectorAll('[onclick^="changeView"]');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const view = btn.textContent.toLowerCase().includes('monat') ? 'month' :
                           btn.textContent.toLowerCase().includes('woche') ? 'week' : 'day';
                this.changeView(view);
            });
        });
        
        // Navigation Buttons - verwende IDs statt onclick
        const prevBtn = document.getElementById('prevMonthBtn');
        const nextBtn = document.getElementById('nextMonthBtn');
        const todayBtn = document.getElementById('todayBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateCalendar('prev');
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateCalendar('next');
            });
        }
        
        if (todayBtn) {
            todayBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToToday();
            });
        }
        
        // Day Selection
        document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('click', (e) => {
                if (e.target.classList.contains('event-item')) return;
                this.selectDay(day);
            });
        });
        
        // Event Form
        this.bindEventForm();
    }
    
    bindEventForm() {
        const form = document.getElementById('createEventForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEventSubmit(form);
            });
        }
        
        // All-day checkbox
        const allDayCheckbox = document.getElementById('eventAllDay');
        if (allDayCheckbox) {
            allDayCheckbox.addEventListener('change', (e) => {
                const timeInputs = ['eventStartTime', 'eventEndTime'];
                timeInputs.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.disabled = e.target.checked;
                        if (e.target.checked) input.value = '';
                    }
                });
            });
        }
        
        // Date auto-fill
        const startDateInput = document.getElementById('eventStartDate');
        const endDateInput = document.getElementById('eventEndDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', (e) => {
                if (!endDateInput.value) {
                    endDateInput.value = e.target.value;
                }
            });
        }
    }
    
    changeView(view) {
        this.currentView = view;
        
        // Hide all views
        document.querySelectorAll('.calendar-view').forEach(v => v.classList.add('d-none'));
        
        // Show selected view
        document.getElementById(`${view}View`).classList.remove('d-none');
        
        // Update active button
        document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}ViewBtn`).classList.add('active');
        
        // Render view-specific content
        if (view === 'week') {
            this.renderWeekView();
        } else if (view === 'day') {
            this.renderDayView();
        }
    }
    
    navigateCalendar(direction) {
        if (this.currentView === 'month') {
            if (direction === 'prev') {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            } else {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            }
        } else if (this.currentView === 'week') {
            if (direction === 'prev') {
                this.currentDate.setDate(this.currentDate.getDate() - 7);
            } else {
                this.currentDate.setDate(this.currentDate.getDate() + 7);
            }
        } else if (this.currentView === 'day') {
            if (direction === 'prev') {
                this.currentDate.setDate(this.currentDate.getDate() - 1);
            } else {
                this.currentDate.setDate(this.currentDate.getDate() + 1);
            }
        }
        
        this.reloadCalendar();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.reloadCalendar();
    }
    
    reloadCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        window.location.href = `/calender?year=${year}&month=${month}`;
    }
    
    selectDay(dayElement) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
        
        // Add selection to clicked day
        dayElement.classList.add('selected');
        this.selectedDate = dayElement.dataset.date;
        
        // Pre-fill create event modal with selected date
        const startDateInput = document.getElementById('eventStartDate');
        if (startDateInput) {
            startDateInput.value = this.selectedDate;
        }
    }
    
    async handleEventSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            this.showLoading(true);
            
            const response = await fetch('/calender/event/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
                if (modal) modal.hide();
                
                // Reload calendar
                this.reloadCalendar();
            } else {
                alert('Fehler beim Erstellen des Events: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ein Fehler ist aufgetreten.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async showEventDetails(eventId) {
        try {
            const response = await fetch(`/calender/event/${eventId}`);
            if (response.ok) {
                window.location.href = `/calender/event/${eventId}`;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('d-none', !show);
        }
    }
    
    renderWeekView() {
        // Implementierung für Wochenansicht
        const weekGrid = document.querySelector('.week-grid');
        if (!weekGrid) return;
        
        weekGrid.innerHTML = '';
        
        // Header mit Wochentagen
        weekGrid.appendChild(this.createWeekHeader());
        
        // Zeitslots
        for (let hour = 0; hour < 24; hour++) {
            weekGrid.appendChild(this.createWeekTimeSlot(hour));
            
            for (let day = 0; day < 7; day++) {
                weekGrid.appendChild(this.createWeekDayCell(day, hour));
            }
        }
    }
    
    renderDayView() {
        // Implementierung für Tagesansicht
        const dayGrid = document.querySelector('.day-grid');
        if (!dayGrid) return;
        
        dayGrid.innerHTML = '';
        
        // Zeitslots
        for (let hour = 0; hour < 24; hour++) {
            dayGrid.appendChild(this.createDayTimeSlot(hour));
            dayGrid.appendChild(this.createDayHourCell(hour));
        }
    }
    
    createWeekHeader() {
        const header = document.createElement('div');
        header.className = 'week-time-slot';
        return header;
    }
    
    createWeekTimeSlot(hour) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'week-time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        return timeSlot;
    }
    
    createWeekDayCell(day, hour) {
        const cell = document.createElement('div');
        cell.className = 'week-day-cell';
        return cell;
    }
    
    createDayTimeSlot(hour) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'day-time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        return timeSlot;
    }
    
    createDayHourCell(hour) {
        const cell = document.createElement('div');
        cell.className = 'day-hour-cell';
        return cell;
    }
}

// Global functions for template compatibility
function changeView(view) {
    if (window.calendarInstance) {
        window.calendarInstance.changeView(view);
    }
}

function navigateCalendar(direction) {
    if (window.calendarInstance) {
        window.calendarInstance.navigateCalendar(direction);
    }
}

function goToToday() {
    if (window.calendarInstance) {
        window.calendarInstance.goToToday();
    }
}

function selectDay(dayElement) {
    if (window.calendarInstance) {
        window.calendarInstance.selectDay(dayElement);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    return timeString.slice(0, 5); // HH:MM format
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Bootstrap modal helpers
function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function hideModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) modal.hide();
}
