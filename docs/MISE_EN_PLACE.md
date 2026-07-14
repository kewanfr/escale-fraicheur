# Mise en place complète du MVP Escale Fraîcheur

Ce guide part de zéro et permet d'obtenir :

- le frontend sur GitHub Pages ;
- le backend Supabase ;
- les signalements anonymes ;
- les comptes établissements ;
- la modération ;
- les photos ;
- une protection anti-spam facultative.

---

## 1. Tester le projet localement

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev
```

Sans configuration supplémentaire, le site démarre en mode démonstration.

---

## 2. Créer le projet Supabase

1. Créez un nouveau projet dans le tableau de bord Supabase.
2. Attendez que la base soit prête.
3. Ouvrez **SQL Editor**.
4. Copiez tout le contenu de :

```text
supabase/migrations/001_initial_schema.sql
```

5. Exécutez le script une seule fois.

Ce script crée notamment :

- `places` ;
- `amenities` ;
- `place_amenities` ;
- `opening_periods` ;
- `place_members` ;
- `place_posts` ;
- `public_submissions` ;
- `claims` ;
- `audit_log` ;
- les politiques RLS ;
- les fonctions de création et de modération ;
- le bucket public `place-media` avec ses règles d'écriture.

### Données de test facultatives

Pour ajouter trois lieux de démonstration à Nantes, exécutez ensuite :

```text
supabase/seed.sql
```

---

## 3. Récupérer les informations publiques Supabase

Dans le tableau de bord Supabase, récupérez :

- l'URL du projet ;
- la **publishable key** destinée au navigateur.

Créez un fichier `.env.local` :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIQUE
VITE_TURNSTILE_SITE_KEY=
VITE_BASE_PATH=/
```

Puis redémarrez :

```bash
npm run dev
```

La carte lira maintenant les lieux réels depuis Supabase.

---

## 4. Déployer la fonction de signalement anonyme

La fonction `public-submission` est publique par conception, car un visiteur ne doit pas créer de compte. Elle valide les données côté serveur et écrit dans la base avec la service role key, qui reste uniquement côté Supabase.

### Méthode avec le CLI Supabase

Installez le CLI :

```bash
npm install -g supabase
```

Connectez-vous :

```bash
supabase login
```

Liez le projet :

```bash
supabase link --project-ref VOTRE_PROJECT_REF
```

Déployez la fonction :

```bash
supabase functions deploy public-submission --no-verify-jwt
```

La configuration `supabase/config.toml` prévoit également `verify_jwt = false` pour cette fonction.

### Origines autorisées

Pour un test, la fonction accepte toutes les origines si `ALLOWED_ORIGINS` n'est pas défini.

Avant un lancement public, définissez par exemple :

```bash
supabase secrets set ALLOWED_ORIGINS="https://votre-domaine.fr,https://votre-compte.github.io"
```

---

## 5. Ajouter Cloudflare Turnstile

Cette étape est facultative en local, mais recommandée avant un lancement public.

1. Créez un widget Turnstile dans Cloudflare.
2. Ajoutez vos domaines autorisés.
3. Copiez la **site key** dans le frontend :

```env
VITE_TURNSTILE_SITE_KEY=VOTRE_SITE_KEY
```

4. Ajoutez le secret uniquement dans Supabase :

```bash
supabase secrets set TURNSTILE_SECRET_KEY="VOTRE_SECRET"
```

Dès que le secret existe côté fonction, tout signalement anonyme doit posséder un token Turnstile valide.

---

## 6. Configurer la connexion des établissements

Le frontend propose :

- Google OAuth ;
- un lien magique par e-mail.

### Lien magique par e-mail

Pour les premiers tests, le service e-mail intégré de Supabase suffit. Pour un usage public réel, configurez un SMTP transactionnel, par exemple Resend, dans les réglages Auth de Supabase.

Dans Supabase Auth, configurez aussi :

- **Site URL** : l'URL publique de votre site ;
- **Redirect URLs** : ajoutez l'URL locale et l'URL GitHub Pages.

Exemples :

```text
http://localhost:5173/**
https://votre-compte.github.io/nom-du-repo/**
https://votre-domaine.fr/**
```

### Google OAuth

Activez Google dans Supabase Auth > Providers et suivez la procédure affichée dans le tableau de bord.

---

## 7. Créer le premier administrateur

1. Connectez-vous une première fois sur le site.
2. Dans le SQL Editor Supabase, exécutez :

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'VOTRE-EMAIL@example.com'
);
```

Déconnectez-vous puis reconnectez-vous.

Le bouton **Modération** apparaîtra dans votre tableau de bord.

---

## 8. Déployer le frontend sur GitHub Pages

Le workflow est déjà fourni :

```text
.github/workflows/deploy-pages.yml
```

### A. Créer le dépôt GitHub

```bash
git init
git add .
git commit -m "Initial MVP Escale Fraîcheur"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-REPO.git
git push -u origin main
```

### B. Ajouter les variables GitHub Actions

Dans :

```text
Settings > Secrets and variables > Actions > Variables
```

Ajoutez :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY     facultatif
VITE_BASE_PATH              facultatif
```

Le workflow calcule automatiquement le chemin `/nom-du-repo/` pour un GitHub Pages de projet.

Définissez explicitement :

```text
VITE_BASE_PATH=/
```

si vous utilisez :

- un domaine personnalisé ;
- ou un dépôt `votre-compte.github.io`.

### C. Activer Pages

Dans :

```text
Settings > Pages
```

choisissez **GitHub Actions** comme source.

Poussez sur `main`. Le workflow construit et déploie automatiquement le site.

---

## 9. Domaine personnalisé

Dans GitHub :

```text
Settings > Pages > Custom domain
```

Ajoutez votre domaine.

Puis définissez la variable GitHub Actions :

```text
VITE_BASE_PATH=/
```

Pensez également à :

- mettre à jour `Site URL` et `Redirect URLs` dans Supabase Auth ;
- ajouter le domaine à `ALLOWED_ORIGINS` dans les secrets de la fonction ;
- ajouter le domaine autorisé dans Turnstile.

---

## 10. Avant une mise en production réelle

Checklist minimale :

- [ ] Turnstile activé ;
- [ ] `ALLOWED_ORIGINS` limité à vos vrais domaines ;
- [ ] SMTP de production configuré pour Supabase Auth ;
- [ ] politique de confidentialité et mentions légales ajoutées ;
- [ ] adresse de contact de modération définie ;
- [ ] sauvegarde et politique de reprise réfléchies ;
- [ ] suppression des lieux de démonstration ;
- [ ] test mobile réel ;
- [ ] vérification des règles RLS après chaque évolution de schéma.

---

## Commandes utiles

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

Pour la fonction Supabase :

```bash
supabase functions serve public-submission --no-verify-jwt
supabase functions deploy public-submission --no-verify-jwt
```
