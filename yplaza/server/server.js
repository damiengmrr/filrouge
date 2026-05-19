const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDb } = require('./db');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const propertiesRoutes = require('./routes/properties.routes');
const agenciesRoutes = require('./routes/agencies.routes');
const usersRoutes = require('./routes/users.routes');
const statsRoutes = require('./routes/stats.routes');
const favoritesRoutes = require('./routes/favorites.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Static pour le client si jamais servi par le backend (optionnel)
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/favorites', favoritesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await initDb();
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Y-Plaza API démarrée sur http://localhost:${config.port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Impossible de démarrer le serveur:', err);
    process.exit(1);
  }
}

start();
