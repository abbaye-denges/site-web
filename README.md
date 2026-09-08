# Flipbook - Livret de fête 2026

Ce dossier contient le livret interactif de l'Abbaye des Fusiliers de Denges. Il est entièrement statique : aucun serveur, compte ou base de données n'est nécessaire. Le PDF reste hébergé avec le site et le lecteur fonctionne directement dans le navigateur.

## Contenu

- `index.html` : la page du flipbook ;
- `styles.css` : l'apparence et l'affichage responsive ;
- `script.js` : le chargement du PDF, la navigation et l'animation des pages ;
- `assets/Livret_de_fete_2026_web.pdf` : le PDF original ;
- `assets/pdf.min.mjs` et `assets/pdf.worker.min.mjs` : le moteur PDF.js inclus localement ;
- `assets/cover.jpg` : aperçu léger de la couverture ;
- `assets/LICENSE-PDFJS.txt` : licence de PDF.js.

## Mise en ligne sur GitHub Pages

1. Créez un nouveau dépôt GitHub, par exemple `livret-fete-2026`.
2. Décompressez le ZIP et ajoutez **tout le contenu du dossier** à la racine du dépôt. `index.html` doit être visible dès la première page du dépôt.
3. Dans GitHub, ouvrez **Settings > Pages**.
4. Sous **Build and deployment**, choisissez **Deploy from a branch**.
5. Sélectionnez la branche `main`, le dossier `/(root)`, puis cliquez sur **Save**.
6. Après une ou deux minutes, le livret sera disponible à une adresse de ce type :

   `https://VOTRE-COMPTE.github.io/livret-fete-2026/`

Les chemins utilisés sont relatifs : le projet fonctionne aussi si le dépôt porte un autre nom.

## Ajouter le lien sur votre site

Remplacez l'adresse d'exemple par l'adresse GitHub Pages obtenue :

```html
<a
  href="https://VOTRE-COMPTE.github.io/livret-fete-2026/"
  target="_blank"
  rel="noopener"
>
  Feuilleter le livret de fête 2026
</a>
```

## Afficher le livret directement dans une page

```html
<iframe
  src="https://VOTRE-COMPTE.github.io/livret-fete-2026/"
  title="Livret de fête 2026 de l'Abbaye des Fusiliers de Denges"
  loading="lazy"
  allowfullscreen
  style="width:100%;height:min(90vh,900px);border:0;border-radius:12px;"
></iframe>
```

## Utilisation

- ordinateur : boutons, clic sur les bords du livret ou flèches du clavier ;
- téléphone : glissement horizontal ou boutons précédent/suivant ;
- touches `Début` et `Fin` : première et dernière page ;
- `Espace`, `Page suivante` et `Page précédente` : navigation rapide ;
- bouton `PDF` : téléchargement du document original ;
- bouton plein écran : lecture immersive ;
- boutons `−`, `+` et pourcentage : zoom et retour à l'ajustement automatique.

## Aperçu local facultatif

Les modules du navigateur doivent être servis par HTTP. Pour tester le site avant sa mise en ligne, ouvrez un terminal dans ce dossier puis lancez :

```bash
python -m http.server 8000
```

Ouvrez ensuite `http://localhost:8000`. Un double-clic direct sur `index.html` peut être bloqué par les règles de sécurité du navigateur ; ce comportement ne concerne pas GitHub Pages.

## Personnalisation rapide

Les couleurs principales se trouvent au début de `styles.css`, dans le bloc `:root`. Le titre affiché peut être modifié dans `index.html` sans toucher au lecteur.
