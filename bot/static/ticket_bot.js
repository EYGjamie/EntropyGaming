document.addEventListener('DOMContentLoaded', function() {
    let saveTimeout;
  
    function saveQuestions() {
      const rows = document.querySelectorAll('#questionsTable tbody tr');
      let questions = [];
      rows.forEach(row => {
        // Nur Zeilen, die verändert wurden, verarbeiten
        if (row.dataset.modified !== 'true') return;
        
        const id = row.getAttribute('data-id');
        const scheduled_date = row.querySelector('.scheduled_date').value;
        const question = row.querySelector('.question').value;
        const answer1 = row.querySelector('.answer1').value;
        const answer2 = row.querySelector('.answer2').value;
        const answer3 = row.querySelector('.answer3').value;
        const correct = row.querySelector('.correct').value;
        const category = row.querySelector('.category').value;
        const asked = row.querySelector('.asked').checked;
        
        questions.push({
          id: id,
          scheduled_date: scheduled_date,
          question: question,
          answer1: answer1,
          answer2: answer2,
          answer3: answer3,
          correct: parseInt(correct),
          category: category,
          asked: asked
        });
        
        // Flag wieder entfernen, nachdem die Zeile in die Liste aufgenommen wurde
        delete row.dataset.modified;
      });
      
      if (questions.length === 0) {
        console.log("Keine geänderten Einträge");
        return;
      }
      
      console.log("Sende Daten an /quizBot:", questions);
  
      fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questions: questions })
      })
      .then(response => {
        if (response.ok) {
          console.log("Speichern erfolgreich!");
        } else {
          console.error("Fehler beim Speichern:", response.statusText);
        }
      })
      .catch(error => {
        console.error('Fehler beim Speichern der Fragen:', error);
      });
    }
  
    function scheduleSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveQuestions, 1000); // 1 Sekunde Verzögerung
    }
  
    // An allen Inputs und Selects lauschen und Flag setzen
    document.querySelectorAll('#questionsTable input, #questionsTable select').forEach(input => {
      input.addEventListener('change', function() {
        this.closest('tr').dataset.modified = 'true';
        scheduleSave();
      });
      input.addEventListener('input', function() {
        this.closest('tr').dataset.modified = 'true';
        scheduleSave();
      });
    });
  });
  