# Pont pour Claude

Extension Chrome (Manifest V3) pour passer d'une discussion Claude à la limite de longueur vers un nouveau chat, sans scroller.

## Idée
- La discussion est **sauvegardée en continu** pendant que tu discutes.
- Une jauge estime la taille (tokens) et prévient à 85 % de la limite que tu as notée.
- Le pont prépare l'historique à coller dans un nouveau chat, découpé en parties.

## Modes
- **Brief** : tes prompts + la dernière réponse
- **Compact** : tes prompts + anciennes réponses réduites (code omis)
- **Complet** : tout, mot pour mot

## Installation
1. `chrome://extensions`, mode développeur
2. « Charger l'extension non empaquetée », choisir ce dossier
3. Ouvre claude.ai : pastille ronde en bas à droite (Alt+B)

## Si la détection ne marche pas
Réglages, « Calibrer la détection » : clique sur un de tes messages, puis sur une réponse de Claude.
Les sélecteurs par défaut sont dans `lib/site.js`.

## Limites
- Pièces jointes non gérées (volontairement).
- Le contenu des artefacts ouvert dans le panneau latéral n'est pas capturé.

## Vie privée
Tout reste dans ton navigateur (chrome.storage). Aucun serveur. « Tout effacer » supprime les archives.
