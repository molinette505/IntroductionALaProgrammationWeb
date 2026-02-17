# Templates quiz

Chaque quiz est un bloc `.quiz-template`.

Le bouton `Valider` affiche:
- le score (`0/1` ou `1/1`),
- les bonnes réponses,
- l'explication (`Pourquoi: ...`) depuis `.quiz-solution`,
- la correction visuelle (vert/rouge) sur les choix.

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
