# Playground (CodeMirror) - NotesAvecExercices

Ce dossier contient le moteur de playground utilise dans les pages de theorie/exercices.

- `editor.js`: generation du composant, execution du code et console.
- `editor.css`: style du playground, console, tiroir et mode plein ecran.

## Prerequis CodeMirror (addons)

Le playground utilise aussi les addons suivants:

- `addon/edit/closebrackets.min.js`
- `addon/hint/show-hint.min.css`
- `addon/hint/show-hint.min.js`
- `addon/hint/javascript-hint.min.js`

## 1) Structure HTML minimale

```html
<div class="playground-container"
     data-type="example"
     data-title="classList + style"
     data-output-default="render"
     data-start-editor="js"
     data-auto-execute="false"
     data-auto-height>

  <textarea class="source-code-html" hidden>...</textarea>
  <textarea class="source-code-css" hidden>...</textarea>
  <textarea class="source-code-js" hidden>...</textarea>

  <textarea class="solution-code-html" hidden>...</textarea>
  <textarea class="solution-code-css" hidden>...</textarea>
  <textarea class="solution-code-js" hidden>...</textarea>
</div>
```

Si `source-code-js` n'existe pas, le playground accepte aussi le legacy:

- `.source-code`
- `.solution-code`

## 2) Data attributes supportes

- `data-type="example|exercise|compare"`
  - `exercise` active le switch `Code / Solution`.
  - `compare` active le switch `Choix A / Choix B`.
- `data-title="..."`
  - Titre affiche dans l'entete.
  - Les prefixes `Exemple:` / `Exercice:` sont nettoyes automatiquement.
- `data-instructions="..."`
  - Message secondaire sous la toolbar.
- `data-toolbar-text="..."`
  - Remplace le texte de la barre d'action (par defaut: `Modifiez le code ci-dessous et testez-le ->`).
  - Alias supporte: `data-run-text`.
- `data-start-editor="js|html|css"`
  - Onglet editeur affiche au chargement.
  - Alias supporte: `data-editor-start`.
- `data-output-default="console|render"`
  - Vue de sortie initiale.
  - Alias supporte: `data-output-view`.
- `data-console-open="true|false"`
  - Ouvre/ferme le tiroir console au depart.
  - Presence simple de l'attribut (`data-console-open`) = ouvert.
  - Valeurs truthy/falsy supportees comme `data-auto-height`.
- `data-auto-execute="true|false"`
  - Controle l'execution automatique au chargement et au changement de mode.
  - Defaut: `true`.
  - Regle speciale: pour `data-type="exercise"`, le mode `Code` (user) n'auto-execute pas, mais le mode `Solution` auto-execute.
- `data-auto-height`
  - Si present (meme sans valeur), ajuste la hauteur du code a son contenu.
  - Valeurs truthy: `true, 1, yes, on, auto, fit, content`.
  - Valeurs falsy: `false, 0, no, off`.
  - Aliases supportes: `data-fit-code`, `data-fit-height`, `data-fit-code-height`.
  - Ne s'applique pas en mode plein ecran.
  - En layout vertical/mobile (console dessous), la hauteur inline est desactivee pour eviter le decalage de poignee.
- `data-label-a="..."`
  - Libelle du bouton A pour `data-type="compare"`.
  - Defaut: `Choix A`.
- `data-label-b="..."`
  - Libelle du bouton B pour `data-type="compare"`.
  - Defaut: `Choix B`.
  - En mode `compare`, les deux onglets sont en lecture seule (comparaison pure).

## 3) Textareas d'entree

Source (mode Code):
- `.source-code-html`
- `.source-code-css`
- `.source-code-js`

Solution (mode Solution):
- `.solution-code-html`
- `.solution-code-css`
- `.solution-code-js`

Comparaison (mode B, pour `data-type="compare"`):
- `.compare-code-html` (alias: `.source-code-b-html`)
- `.compare-code-css` (alias: `.source-code-b-css`)
- `.compare-code-js` (alias: `.source-code-b-js`)
- `.compare-code` (alias JS legacy: `.source-code-b`)

Regles:
- Si une textarea solution manque, la source correspondante est reutilisee.
- Si HTML/CSS manquent, valeur vide.
- Si JS manque, fallback `// Code JavaScript`.
- En mode compare, si les textareas B manquent, fallback vers les textareas solution, puis source.

## 4) Cycle d'execution (Run)

Quand on clique `Executer`:

1. Sauvegarde le contenu de l'onglet actif.
2. Recharge l'iframe de rendu avec `HTML + <style>CSS</style>`.
3. Injecte un `mockConsole` dans l'iframe.
4. Compile le JS via `Function(...)`.
5. Execute le JS avec `console`, `document`, `window` de l'iframe.
6. Affiche logs/erreurs dans la console du playground.

Effet pratique: le JS manipule le DOM du rendu (querySelector, addEventListener, etc.) sans polluer la page parent.

Auto-execution:
- Par defaut, le playground execute automatiquement au chargement.
- Si `data-auto-execute="false"`, il charge seulement le rendu HTML/CSS sans executer le JS.
- En mode `exercise`, `Code` n'auto-execute pas; `Solution` auto-execute.

## 5) Reset

`Reinitialiser` restaure:
- les 3 sources (html/css/js)
- l'onglet de sortie initial
- l'etat visuel de la console
- le rendu iframe
- Le bouton reste actif en mode `Solution`.

## 6) Architecture JS (hors Visualizer)

Le code JS principal du playground est organise en 6 blocs:

1. **Lecture config**: parse des `data-*`, lecture des textareas source/solution.
2. **Build UI**: injection du markup du playground.
3. **Init CodeMirror**: mode, theme, tabs fichiers (HTML/CSS/JS).
4. **Etat UI**: mode Code/Solution, sortie Console/Rendu, tiroir console, fullscreen.
5. **Execution**: rendu iframe + execution JS dans le contexte iframe.
6. **Console custom**: format log/warn/error, localisation ligne/col, navigation vers l'editeur.

Le JS du visualizer externe est volontairement separé dans le sous-projet `js-visualizer`.

## 7) Notes de maintenance

- Si vous ajoutez un nouveau mode de sortie, brancher:
  - `data-output-view`
  - boutons `.output-view-tab`
  - CSS `.output-view-*`
- Pour garder des lignes d'erreur cohérentes, conserver le `sourceURL` (`StudentCode.js`) dans `editor.js`.
- En auto-height, eviter des blobs de code geants (>1000 lignes), sinon preferer `data-auto-height="false"`.

## 8) Autocomplete

- `Ctrl+Espace` ouvre la liste de suggestions.
- Saisie auto: la liste apparait apres quelques caracteres (ou apres `.`).
- Les suggestions incluent:
  - noms de variables/fonctions detectes dans le code JS courant
  - mots-cles JavaScript frequents
  - methodes usuelles (`length`, `pop()`, `push()`, etc.)
- La fermeture auto des paires est activee (`"" '' {} [] () ```) via `autoCloseBrackets`.
