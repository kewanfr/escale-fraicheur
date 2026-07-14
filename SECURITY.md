# Sécurité

Ce MVP applique les principes suivants :

- aucune `service_role_key` dans le frontend ;
- lecture publique limitée aux lieux publiés ;
- écriture sur les lieux réservée aux membres autorisés ;
- opérations de modération contrôlées côté PostgreSQL par des fonctions `security definer` qui vérifient le rôle administrateur ;
- signalements anonymes écrits uniquement via une Edge Function ;
- validation serveur des tailles, URLs, coordonnées et types de soumission ;
- Cloudflare Turnstile optionnel ;
- photos limitées à 5 Mo et à JPG/PNG/WebP ;
- journalisation minimale des actions sensibles.

Avant production, activez Turnstile, limitez `ALLOWED_ORIGINS`, configurez un SMTP de production et réalisez un test dédié des politiques RLS.

Ne mettez jamais dans GitHub ou dans les variables `VITE_*` :

- `SUPABASE_SERVICE_ROLE_KEY` ;
- `TURNSTILE_SECRET_KEY` ;
- une clé API Resend privée.
