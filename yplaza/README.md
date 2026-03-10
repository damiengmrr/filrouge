## Y‑Plaza – Plateforme immobilière

Projet complet pour l’UF B2 INFRA & DEV (Ynov) : application web **Y‑Plaza** avec backend Node/Express + PostgreSQL et frontend HTML/CSS/JS (vanilla).

### Contenu du projet

- `server` : API REST JSON (Node.js, Express, PostgreSQL)
- `client` : interface web (HTML/CSS/JS) consommant l’API via `fetch`

### Mise en route rapide

1. **Cloner / copier le projet** dans un dossier local.
2. **Backend** :
   - Aller dans `server` :
     ```bash
     cd server
     npm install
     ```
   - Créer une base PostgreSQL (par défaut `yplaza`) :
     ```bash
     createdb yplaza
     ```
   - (Optionnel) Exporter les variables d’environnement (`DB_HOST`, `DB_NAME`, etc.) si nécessaire.
   - Lancer l’API :
     ```bash
     npm run dev   # ou npm start
     ```
3. **Frontend** :
   - Ouvrir `client/index.html` dans le navigateur
     - soit directement (double‑clic)
     - soit via un petit serveur statique / extension *Live Server*.

### Comptes de test

- Admin : `admin@yplaza.test` / `Admin123!`
- Agent : `agent@yplaza.test` / `Agent123!`
- Client : `client@yplaza.test` / `Client123!`

### Documentation détaillée

Consultez `server/README.md` pour :

- le détail des endpoints de l’API
- la description du schéma SQL (`schema.sql`) et des données seed (`seed.sql`)
- les exigences d’authentification (JWT + cookie httpOnly) et les rôles (`client`, `agent`, `admin`).

