// webapp/internal/static/js/forum-editor-enhanced.js

document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('content');
    const previewDiv = document.getElementById('preview');
    const previewContent = previewDiv?.querySelector('.preview-content');
    const editorToggle = document.getElementById('editorToggle');
    const previewToggle = document.getElementById('previewToggle');
    const splitToggle = document.getElementById('splitToggle');
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    
    let currentMode = 'editor';
    let previewTimeout;

    // Initialize
    if (editor) {
        updateStats();
        setupToolbar();
        setupMathSupport();
        setupMermaidSupport();
        
        // Auto-save functionality
        setupAutoSave();
        
        // Live preview with debouncing
        editor.addEventListener('input', function() {
            updateStats();
            
            if (currentMode === 'split' || currentMode === 'preview') {
                clearTimeout(previewTimeout);
                previewTimeout = setTimeout(updatePreview, 500);
            }
        });
    }

    // Mode switching
    if (editorToggle) {
        editorToggle.addEventListener('click', () => switchMode('editor'));
    }
    if (previewToggle) {
        previewToggle.addEventListener('click', () => switchMode('preview'));
    }
    if (splitToggle) {
        splitToggle.addEventListener('click', () => switchMode('split'));
    }

    function switchMode(mode) {
        currentMode = mode;
        
        // Update button states
        document.querySelectorAll('.mode-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = {
            'editor': editorToggle,
            'preview': previewToggle,
            'split': splitToggle
        }[mode];
        
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Update layout
        const editorArea = document.querySelector('.editor-area');
        if (!editorArea) return;
        
        switch (mode) {
            case 'editor':
                editor.style.display = 'block';
                previewDiv.style.display = 'none';
                editorArea.classList.remove('split-view');
                break;
                
            case 'preview':
                editor.style.display = 'none';
                previewDiv.style.display = 'block';
                editorArea.classList.remove('split-view');
                updatePreview();
                break;
                
            case 'split':
                editor.style.display = 'block';
                previewDiv.style.display = 'block';
                editorArea.classList.add('split-view');
                updatePreview();
                break;
        }
    }

    function updateStats() {
        if (!editor) return;
        
        const content = editor.value;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        
        if (wordCount) wordCount.textContent = `${words} Wörter`;
        if (charCount) charCount.textContent = `${chars} Zeichen`;
    }

    function updatePreview() {
        if (!previewContent || !editor) return;
        
        const content = editor.value;
        
        if (!content.trim()) {
            previewContent.innerHTML = '<p class="text-muted"><i class="bi bi-eye"></i> Keine Vorschau verfügbar</p>';
            return;
        }
        
        previewContent.innerHTML = '<p class="text-muted"><i class="bi bi-arrow-repeat spin"></i> Vorschau wird geladen...</p>';
        
        fetch('/forum/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                previewContent.innerHTML = data.html;
                
                // Initialize any special content
                initializeMermaid();
                initializeMath();
            } else {
                previewContent.innerHTML = '<p class="text-error">Fehler beim Laden der Vorschau</p>';
            }
        })
        .catch(error => {
            console.error('Preview error:', error);
            previewContent.innerHTML = '<p class="text-error">Fehler beim Laden der Vorschau</p>';
        });
    }

    function setupToolbar() {
        const toolbarButtons = document.querySelectorAll('.toolbar-btn');
        
        toolbarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                handleToolbarAction(action);
            });
        });
    }

    function handleToolbarAction(action) {
        if (!editor) return;
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);
        
        let replacement = '';
        let cursorOffset = 0;
        
        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'fetter Text'}**`;
                cursorOffset = selectedText ? 0 : -2;
                break;
                
            case 'italic':
                replacement = `*${selectedText || 'kursiver Text'}*`;
                cursorOffset = selectedText ? 0 : -1;
                break;
                
            case 'strikethrough':
                replacement = `~~${selectedText || 'durchgestrichener Text'}~~`;
                cursorOffset = selectedText ? 0 : -2;
                break;
                
            case 'code':
                if (selectedText.includes('\n')) {
                    replacement = `\`\`\`\n${selectedText || 'Code hier einfügen'}\n\`\`\``;
                    cursorOffset = selectedText ? 0 : -4;
                } else {
                    replacement = `\`${selectedText || 'Code'}\``;
                    cursorOffset = selectedText ? 0 : -1;
                }
                break;
                
            case 'quote':
                const lines = (selectedText || 'Zitat').split('\n');
                replacement = lines.map(line => `> ${line}`).join('\n');
                break;
                
            case 'link':
                replacement = `[${selectedText || 'Link Text'}](https://beispiel.de)`;
                cursorOffset = selectedText ? -20 : -1;
                break;
                
            case 'image':
                replacement = `![${selectedText || 'Alt Text'}](Bild-URL)`;
                cursorOffset = selectedText ? -10 : -1;
                break;
                
            case 'list':
                const listLines = (selectedText || 'Listenelement 1\nListenelement 2').split('\n');
                replacement = listLines.map(line => `- ${line}`).join('\n');
                break;
                
            case 'ordered-list':
                const orderedLines = (selectedText || 'Erstes Element\nZweites Element').split('\n');
                replacement = orderedLines.map((line, index) => `${index + 1}. ${line}`).join('\n');
                break;
                
            case 'task-list':
                const taskLines = (selectedText || 'Aufgabe 1\nAufgabe 2').split('\n');
                replacement = taskLines.map(line => `- [ ] ${line}`).join('\n');
                break;
                
            case 'table':
                replacement = `| Spalte 1 | Spalte 2 | Spalte 3 |
|----------|----------|----------|
| Zeile 1  | Inhalt   | Inhalt   |
| Zeile 2  | Inhalt   | Inhalt   |`;
                break;
                
            case 'heading':
                replacement = `## ${selectedText || 'Überschrift'}`;
                cursorOffset = selectedText ? 0 : 0;
                break;
                
            case 'math':
                if (selectedText.includes('\n')) {
                    replacement = `$$\n${selectedText || 'E = mc^2'}\n$$`;
                } else {
                    replacement = `$${selectedText || 'x^2'}$`;
                }
                cursorOffset = selectedText ? 0 : -1;
                break;
                
            case 'mermaid':
                replacement = `\`\`\`mermaid
graph TD
    A[Start] --> B{Entscheidung}
    B -->|Ja| C[Aktion 1]
    B -->|Nein| D[Aktion 2]
\`\`\``;
                break;
                
            case 'help':
                showMarkdownHelp();
                return;
                
            default:
                return;
        }
        
        // Insert the replacement text
        editor.value = beforeText + replacement + afterText;
        
        // Set cursor position
        const newPosition = start + replacement.length + cursorOffset;
        editor.setSelectionRange(newPosition, newPosition);
        
        // Focus editor and update preview
        editor.focus();
        updateStats();
        
        if (currentMode === 'split' || currentMode === 'preview') {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(updatePreview, 300);
        }
    }

    function setupAutoSave() {
        let autoSaveTimeout;
        const AUTOSAVE_DELAY = 30000; // 30 seconds
        
        editor.addEventListener('input', function() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(saveAsDraft, AUTOSAVE_DELAY);
        });
    }

    function saveAsDraft() {
        const title = document.getElementById('title')?.value;
        const content = editor.value;
        
        if (!title && !content) return;
        
        // Save to localStorage as backup
        const draftData = {
            title: title,
            content: content,
            timestamp: Date.now()
        };
        
        localStorage.setItem('forum_post_draft', JSON.stringify(draftData));
        console.log('Draft auto-saved locally');
    }

    function setupMathSupport() {
        // Initialize MathJax if available
        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.document) {
            window.MathJax.startup.document.updateDocument();
        }
    }

    function setupMermaidSupport() {
        // Initialize Mermaid if available
        if (window.mermaid) {
            window.mermaid.initialize({ 
                theme: 'dark',
                startOnLoad: true 
            });
        }
    }

    function initializeMermaid() {
        if (window.mermaid) {
            const mermaidElements = previewDiv.querySelectorAll('.mermaid');
            mermaidElements.forEach((element, index) => {
                element.id = `mermaid-${Date.now()}-${index}`;
                window.mermaid.init(undefined, element);
            });
        }
    }

    function initializeMath() {
        if (window.MathJax) {
            window.MathJax.typesetPromise([previewDiv]).catch((err) => {
                console.log('MathJax error:', err);
            });
        }
    }

    // Load draft on page load
    function loadDraft() {
        const draftData = localStorage.getItem('forum_post_draft');
        if (draftData) {
            try {
                const draft = JSON.parse(draftData);
                const age = Date.now() - draft.timestamp;
                
                // Only load drafts less than 24 hours old
                if (age < 24 * 60 * 60 * 1000) {
                    const titleField = document.getElementById('title');
                    if (titleField && !titleField.value && draft.title) {
                        titleField.value = draft.title;
                    }
                    
                    if (editor && !editor.value && draft.content) {
                        editor.value = draft.content;
                        updateStats();
                    }
                }
            } catch (e) {
                console.error('Error loading draft:', e);
            }
        }
    }

    // Load draft if this is a new post
    if (window.location.pathname.includes('/create')) {
        loadDraft();
    }

    // Export global functions
    window.showMarkdownHelp = showMarkdownHelp;
    window.saveAsDraft = saveAsDraft;
});

function showMarkdownHelp() {
    const modal = document.getElementById('markdownHelpModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeMarkdownHelp() {
    const modal = document.getElementById('markdownHelpModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('markdownHelpModal');
    if (event.target === modal) {
        closeMarkdownHelp();
    }
});