# 🌍 Language Learning App

Une application web moderne et interactive conçue pour faciliter l'apprentissage des langues (actuellement optimisée pour le **Coréen** 🇰🇷 et le **Japonais** 🇯🇵). Utilisant la puissance de l'Intelligence Artificielle (**Mistral AI**) et une infrastructure robuste (**Supabase**), elle offre une expérience d'apprentissage personnalisée.

![Aperçu de l'application](public/screenshot.png) <!-- N'oubliez pas d'ajouter une capture d'écran si possible -->

## ✨ Fonctionnalités Clés

- **🤖 Tuteur AI Intelligent** : Discutez en temps réel avec un tuteur virtuel (propulsé par Mistral AI) qui s'adapte à votre niveau et corrige vos erreurs.
- **📚 Leçons Générées par IA** : Des cours sur mesure créés dynamiquement selon votre progression, incluant explications, vocabulaire et quiz.
- **🃏 Système de Flashcards & Révision** : Mémorisez le vocabulaire efficacement grâce à des outils de répétition espacée.
- **🔤 Apprentissage des Alphabets** : Modules dédiés pour maîtriser le **Hangeul** (Coréen) et les **Hiragana/Katakana** (Japonais).
- **👤 Profil & Progression** : Suivez votre avancement, gérez vos paramètres de langue (interface et cible) et vos préférences.
- **🌗 Mode Sombre & UI Moderne** : Une interface soignée, responsive et agréable à utiliser, développée avec Tailwind CSS.
- **🔐 Authentification Sécurisée** : Gestion des comptes utilisateurs via Supabase.

## 🛠️ Stack Technique

Ce projet utilise les dernières technologies web pour garantir performance et maintenabilité :

- **Frontend** : [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend / Auth** : [Supabase](https://supabase.com/)
- **Intelligence Artificielle** : [Mistral AI API](https://mistral.ai/)
- **PWA** : Support Progressive Web App via `vite-plugin-pwa`

## 🚀 Installation et Démarrage

Suivez ces étapes pour lancer le projet localement :

### 1. Pré-requis

Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre machine.

### 2. Cloner le projet

```bash
git clone https://github.com/MMatfox/langage-learning-app.git
cd langage-learning-app
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet et ajoutez vos clés API :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
VITE_MISTRAL_API_KEY=votre_clé_api_mistral
```

> **Note** : Vous aurez besoin d'un projet Supabase configuré et d'une clé API Mistral AI valide.

### 5. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible (par défaut) sur `http://localhost:5173`.

## 📂 Structure du Projet

```
src/
├── tabs/               # Les vues principales de l'application (Home, Lessons, Tutor, etc.)
├── services/           # Logique métier et appels API (aiService.js, supabaseClient.js)
├── components/         # Composants réutilisables (ex: Popup.jsx, NavButton dans App.jsx)
├── assets/             # Images et ressources statiques
├── translations.js     # Fichier de traduction pour l'internationalisation
├── App.jsx             # Composant racine et gestion de la navigation
└── ...
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une Pull Request pour proposer des améliorations.

## 📄 Licence
