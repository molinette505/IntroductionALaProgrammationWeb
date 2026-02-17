# Templates quiz

Chaque quiz est un bloc `.quiz-template`.

Le bouton `Valider` affiche:
- le score (`0/1` ou `1/1`),
- le feedback,
- le contenu exact de `.quiz-solution` (sans préfixe automatique),
- la correction visuelle (vert/rouge) sur les choix.

Tu peux personnaliser le message d'erreur avec `wrongMessage` dans `.quiz-config`:
```json
{ "answer": "b", "wrongMessage": "Pas encore, relis la règle de base." }
```

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

## 5) MixAndMatch (drag-and-drop)
```html
<div class="quiz-template" data-type="mixAndMatch" data-title="Associer concepts et définitions">
  <p class="quiz-prompt">Glisse chaque réponse dans la bonne case.</p>

  <!-- Écris les paires dans le bon ordre (solution) -->
  <ul class="quiz-match-pairs">
    <li data-left="innerText">Modifie le texte visible d'un élément</li>
    <li data-left="innerHTML">Injecte du HTML dans l'élément</li>
    <li data-left="value">Lit/écrit la valeur d'un input</li>
  </ul>

  <textarea class="quiz-solution" hidden>
innerText agit sur le texte, innerHTML sur la structure HTML, et value sur les champs de formulaire.
  </textarea>
</div>
```

Le type `mixAndMatch` ajoute automatiquement un bouton `Voir la réponse` qui place toutes les cartes dans les bonnes cases.

Alternative supportée (2 listes appariées via `data-id`):
```html
<ul class="quiz-match-left">
  <li data-id="a">innerText</li>
  <li data-id="b">innerHTML</li>
</ul>
<ul class="quiz-match-right">
  <li data-id="a">Texte visible</li>
  <li data-id="b">Structure HTML</li>
</ul>
```
