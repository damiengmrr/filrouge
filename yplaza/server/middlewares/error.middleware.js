// Middleware de gestion centralisée des erreurs
// Toute erreur passée à next(err) arrivera ici.

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message =
    err.message || 'Une erreur interne est survenue. Veuillez réessayer plus tard.';

  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: {
      message,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: 'Ressource non trouvée',
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};

