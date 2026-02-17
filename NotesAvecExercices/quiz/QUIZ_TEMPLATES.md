# Templates quiz

Chaque quiz est un bloc `.quiz-template`.

## 1) Choix simple
```html
<div class="quiz-template" data-type="single" data-title="Quiz">
  <p class="quiz-prompt">Question...</p>
  <ul class="quiz-options">
    <li data-value="a">Option A</li>
    <li data-value="b">Option B</li>
  </ul>
  <script type="application/json" class="quiz-config">
    { "answer": "b" }
  </script>
  <textarea class="quiz-solution" hidden>Explication...</textarea>
</div>
```

## 2) Choix multiples
```html
<div class="quiz-template" data-type="multi" data-title="Quiz">
  <p class="quiz-prompt">Question...</p>
  <ul class="quiz-options">
    <li data-value="a">Option A</li>
    <li data-value="b">Option B</li>
    <li data-value="c">Option C</li>
  </ul>
  <script type="application/json" class="quiz-config">
    { "answers": ["a", "c"] }
  </script>
  <textarea class="quiz-solution" hidden>Explication...</textarea>
</div>
```

## 3) Champ texte
```html
<div class="quiz-template" data-type="text" data-title="Quiz">
  <p class="quiz-prompt">Écrire la réponse...</p>
  <script type="application/json" class="quiz-config">
    {
      "answers": ["bonjour", "salut"],
      "caseSensitive": false,
      "placeholder": "Ta réponse"
    }
  </script>
  <textarea class="quiz-solution" hidden>Réponse attendue...</textarea>
</div>
```

## 4) Ordonner des éléments
```html
<div class="quiz-template" data-type="order" data-title="Quiz">
  <p class="quiz-prompt">Mets les étapes dans l'ordre.</p>
  <ul class="quiz-options">
    <li data-value="a">Étape A</li>
    <li data-value="b">Étape B</li>
    <li data-value="c">Étape C</li>
  </ul>
  <script type="application/json" class="quiz-config">
    { "order": ["b", "a", "c"] }
  </script>
  <textarea class="quiz-solution" hidden>Ordre: B -> A -> C</textarea>
</div>
```

## 5) Éditeur de code (JS + HTML + vérifications)
```html
<div class="quiz-template" data-type="code" data-title="Quiz code">
  <p class="quiz-prompt">Complète le code.</p>

  <textarea class="quiz-starter" hidden>
const nom = "Ada";
// TODO
  </textarea>

  <textarea class="quiz-html" hidden>
<div id="out"></div>
  </textarea>

  <textarea class="quiz-css" hidden>
#out { color: #fff; }
  </textarea>

  <script type="application/json" class="quiz-config">
    {
      "checks": [
        { "type": "variable", "name": "message", "equals": "Bonjour Ada", "message": "message doit valoir Bonjour Ada" },
        { "type": "consoleIncludes", "value": "Bonjour Ada", "message": "console.log doit inclure Bonjour Ada" },
        { "type": "domText", "selector": "#out", "includes": "Bonjour Ada", "message": "#out doit afficher Bonjour Ada" }
      ]
    }
  </script>

  <textarea class="quiz-validator" hidden>
// Optionnel: validator personnalisé avec quizApi
return {
  valid: quizApi.exists('#out') && quizApi.text('#out').includes('!'),
  message: "Ajoute un point d'exclamation dans #out"
};
  </textarea>

  <textarea class="quiz-solution-code" hidden>
const nom = "Ada";
const message = `Bonjour ${nom}!`;
console.log(message);
document.querySelector('#out').textContent = message;
  </textarea>
</div>
```

## API du validator personnalisé
- `quizApi.getVar(name)`
- `quizApi.hasVar(name)`
- `quizApi.getLogs()`
- `quizApi.getConsoleText()`
- `quizApi.query(selector)`
- `quizApi.exists(selector)`
- `quizApi.text(selector)`
- `quizApi.value(selector)`
- `quizApi.attr(selector, attrName)`
