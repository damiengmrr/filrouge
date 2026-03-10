## Y‑Plaza – Backend (API)

Backend Node.js / Express / PostgreSQL pour la plateforme immobilière **Y‑Plaza** (projet Ynov INFRA & DEV).

### 1. Prérequis

- Node.js 18+ et npm
- PostgreSQL 13+ en local

### 2. Installation

Dans le dossier `server` :

```bash
cd server
npm install
```

### 3. Configuration de la base de données

1. Créez une base PostgreSQL nommée `yplaza` (ou autre) :

```bash
createdb yplaza
```

2. (Optionnel) Configurez les variables d’environnement si besoin (sinon des valeurs par défaut sont utilisées) :

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=yplaza
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=changeme_en_prod
export PORT=4000
```

3. Au **premier démarrage**, le serveur exécute automatiquement :

- `sql/schema.sql` pour créer les tables
- `sql/seed.sql` pour insérer les données de démo (agences, biens, utilisateurs, favoris)

### 4. Lancer l’API

Depuis le dossier `server` :

```bash
npm run dev   # avec nodemon
# ou
npm start     # node server.js
```

L’API écoute par défaut sur `http://localhost:4000`.

### 5. Comptes de test

- **Admin** : `admin@yplaza.test` / `Admin123!`
- **Agent** : `agent@yplaza.test` / `Agent123!`
- **Client** : `client@yplaza.test` / `Client123!`

Les mots de passe sont déjà hashés dans `sql/seed.sql`.

### 6. Endpoints principaux

Base URL : `http://localhost:4000/api`

#### Auth

- `POST /auth/register` – `{ name, email, password }` → crée un user `client`, renvoie l’utilisateur et pose un cookie JWT httpOnly.
- `POST /auth/login` – `{ email, password }` → authentifie, pose un cookie JWT, renvoie l’utilisateur.
- `POST /auth/logout` – supprime le cookie JWT.
- `GET /auth/me` – renvoie `{ user }` à partir du cookie ou `user: null`.
- `GET /auth/users` – (admin) liste tous les utilisateurs.
- `PATCH /auth/users/:id/role` – (admin) change le rôle (`client`, `agent`, `admin`).

#### Properties

- `GET /properties` – liste paginée avec filtres en query :
  - `city`, `minPrice`, `maxPrice`, `type`, `status`, `page`, `limit`, `sort` (`price_asc`, `price_desc`, `views_desc`, `created_at_desc` par défaut).
- `GET /properties/:id` – détail d’un bien + incrémentation de `views_count`.
- `POST /properties` – (agent/admin) crée un bien.
- `PUT /properties/:id` – (agent propriétaire ou admin) met à jour un bien.
- `DELETE /properties/:id` – (agent propriétaire ou admin) supprime un bien.
- `PATCH /properties/:id/status` – (agent/admin) change `status` (`available` / `sold`).

#### Agencies

- `GET /agencies` – liste des agences.
- `POST /agencies` – (admin) crée une agence.
- `PUT /agencies/:id` – (admin) met à jour une agence.
- `DELETE /agencies/:id` – (admin) supprime une agence.

#### Favorites

- `GET /favorites` – (client connecté) liste ses favoris.
- `POST /favorites/:propertyId` – ajoute un bien aux favoris.
- `DELETE /favorites/:propertyId` – enlève un bien des favoris.

#### Stats / Data

- `GET /stats/overview` – renvoie :
  - `total_properties`
  - `avg_price_by_city` (top 5)
  - `most_viewed_properties` (top 5)
  - `properties_count_by_type`
  - `trend_score_by_city` (score simple basé sur le volume et le prix moyen)

### 7. Frontend

Le frontend statique se trouve dans le dossier `client` à la racine du projet (`/yplaza/client`).

- Lancez l’API (`npm run dev` dans `server`).
- Ouvrez `client/index.html` dans un navigateur (idéalement via une extension type *Live Server* ou un petit serveur statique).

