Lecteur MP3

Un lecteur de musique de bureau élégant et performant, développé avec **Electron.js**, **Node.js**, **HTML**, **CSS** et **JavaScript**. 

Ce projet a été conçu pour offrir une interface utilisateur fluide et des fonctionnalités avancées de gestion audio, tout en explorant les capacités des applications de bureau hybrides.

Voir la Démo Web - Version Allégée :  https://talbi-s.github.io/LecteurMP3/

Note concernant la Démo Web :
> Le lien ci-dessus est une version adaptée pour les navigateurs web afin d'apercevoir le design de l'application. Pour des raisons de sécurité liées aux navigateurs, les fonctionnalités natives (comme le scan automatique de dossiers locaux ou le serveur OBS) sont désactivées. 
> Pour tester l'application complète, veuillez l'installer via le lien ci-dessous.

Télécharger et Tester (Version PC Complète) :

Pour profiter de l'intégralité des fonctionnalités (notamment la synchronisation de dossiers locaux et l'intégration OBS), téléchargez directement l'application prête à l'emploi :

Télécharger Raven Music Player pour Windows (.exe) https://github.com/Talbi-S/LecteurMP3/releases/download/v1.0.0/Lecteur.MP3.Setup.1.0.0.exe

Fonctionnalités Principales (Version Native)

- Lecteur Audio Complet : Lecture, pause, suivant, précédent, aléatoire (shuffle) et répétition.
- Scan de Dossier Dynamique : Surveille un dossier local et met à jour automatiquement la bibliothèque dès qu'une nouvelle musique y est ajoutée ou supprimée.
- Gestion de Playlists : Création, renommage, suppression de playlists personnalisées et ajout de musiques.
- Extraction de Métadonnées : Récupération et affichage automatiques des pochettes d'albums (via jsmediatags).
- Intégration OBS Studio : Serveur local intégré permettant d'afficher le titre en cours de lecture et sa pochette directement sur un stream OBS.
- Paramètres Persistants : Sauvegarde du volume par défaut et des dossiers surveillés entre chaque session.

Technologies Utilisées :

- Frontend : HTML5, CSS3, JavaScript (Vanilla)
- Backend / Desktop : Electron.js, Node.js
- Librairies : jsmediatags (lecture des tags ID3)

Pour les développeurs (Installation depuis les sources)

Si vous souhaitez explorer le code source et lancer l'environnement de développement :

1. Clonez le dépôt : `git clone https://github.com/Talbi-S/LecteurMP3.git`
2. Installez les dépendances : `npm install`
3. Lancez l'application : `npm start`


Développeur

Développé par ( Talbi-S ) dans le cadre d'un projet personnel pour monter en compétences sur Node.js et Electron.
