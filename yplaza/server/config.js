require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'yplaza',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_yplaza_secret_change_me',
    expiresIn: '7d',
  },
  cookie: {
    name: process.env.COOKIE_NAME || 'yplaza_token',
    options: {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  },
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5500')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
};

module.exports = config;

