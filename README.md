# Escale Fraîcheur — MVP

MVP complet d'une carte collaborative pour le dispositif **Escale Fraîcheur**.

Le projet est conçu pour fonctionner immédiatement en **mode démonstration** sans backend, puis pour passer à un fonctionnement réel avec **Supabase** et un déploiement gratuit du frontend sur **GitHub Pages**.

## Ce qui est déjà inclus

### Public, sans compte
- carte interactive MapLibre + OpenFreeMap ;
- recherche d'adresse via le service officiel de géocodage/autocomplétion de la Géoplateforme ;
- filtres par statut et services ;
- fiche détaillée d'une Escale ;
- horaires, modalités, statut, actualités et itinéraire ;
- signalement anonyme d'un nouveau lieu ;
- signalement anonyme d'une erreur sur une fiche existante ;
- contact e-mail facultatif ;
- protection Cloudflare Turnstile optionnelle.

### Établissements connectés
- connexion Google ou lien magique par e-mail via Supabase Auth ;
- création d'un nouvel établissement ;
- revendication d'une fiche existante ;
- modification du statut, des modalités et de la description ;
- photo du lieu via Supabase Storage ;
- publications temporaires avec expiration facultative.

### Administration
- file de modération des signalements anonymes ;
- validation des nouveaux lieux ;
- validation des demandes de revendication ;
- historique minimal des actions sensibles dans `audit_log`.

## Architecture

```text
GitHub Pages
  └── React + Vite + TypeScript
       ├── MapLibre + OpenFreeMap
       ├── Géoplateforme pour les adresses
       └── Supabase SDK
             ├── PostgreSQL + PostGIS
             ├── Auth
             ├── Storage
             ├── RLS
             └── Edge Function public-submission
                    └── Cloudflare Turnstile optionnel
```

## Lancer immédiatement en mode démonstration

```bash
npm install
npm run dev
```

Ouvrez ensuite l'URL affichée par Vite.

Sans fichier `.env`, le site utilise automatiquement quatre lieux de démonstration autour de Nantes. Les formulaires fonctionnent visuellement, mais les données ne sont pas enregistrées.

## Passer au vrai backend

Le guide complet se trouve ici : **[docs/MISE_EN_PLACE.md](docs/MISE_EN_PLACE.md)**.

Les grandes étapes sont :

1. créer un projet Supabase ;
2. appliquer `supabase/migrations/001_initial_schema.sql` ;
3. déployer l'Edge Function `public-submission` ;
4. renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ;
5. pousser le dépôt sur GitHub et activer GitHub Pages via GitHub Actions.

## Variables frontend

Copiez `.env.example` vers `.env.local` pour travailler localement :

```bash
cp .env.example .env.local
```

Puis renseignez :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIQUE
VITE_TURNSTILE_SITE_KEY=
VITE_BASE_PATH=/
```

La clé publique Supabase est destinée à être utilisée dans le navigateur. La sécurité repose sur les politiques RLS fournies dans la migration. **Ne mettez jamais la service role key dans le frontend.**

## Structure du projet

```text
src/
├── components/       composants d'interface
├── context/          session utilisateur
├── data/             données de démo et catalogue de services
├── hooks/            hooks React
├── lib/              Supabase, API métier, géocodage, formatage
└── pages/            carte, fiche, signalement, connexion, dashboard, admin

supabase/
├── migrations/       schéma PostgreSQL, RLS et RPC
├── functions/        Edge Functions
└── seed.sql           données de test facultatives
```

## Vérifications locales

```bash
npm run typecheck
npm run lint
npm run build
```

Le build copie automatiquement `index.html` vers `404.html` pour permettre les routes React directes sur GitHub Pages.

## Points volontairement laissés simples dans ce MVP

- Une correction anonyme approuvée est marquée comme traitée mais n'est pas automatiquement appliquée à la fiche : le modérateur conserve la décision finale.
- Les horaires peuvent être lus et affichés, mais leur édition détaillée jour par jour n'est pas encore exposée dans le tableau de bord.
- Une nouvelle fiche créée par un établissement reste `pending` jusqu'à validation par un administrateur.
- Le premier administrateur doit être promu manuellement une seule fois dans Supabase.

Ces choix réduisent le risque d'informations erronées publiées automatiquement pendant un épisode de forte chaleur.
