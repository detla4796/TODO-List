const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: (msg) => console.log(`[Database] ${msg}`),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      timeout: 5000,
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connection established successfully.');
    
    console.log('[Database] Configuration:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER ? '****' : 'undefined',
      dialect: 'postgres'
    });
  } catch (error) {
    console.error('[Database] Connection error:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    console.error('[Database] Failed to connect to database');
  }
})();

module.exports = sequelize;