const mysql = require('mysql2');

// Base de datos local
const localDb = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'chapatas2',
    database: 'estacion_rogue_trader',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Base de datos en Supabase
const cloudDb = mysql.createPool({
    host: 'aws-0-eu-west-3.pooler.supabase.com', // Host de tu Supabase
    user: 'postgres.sgzkxrdlsrdecrxizrgy', // Usuario de Supabase
    password: 'tu-contraseña-de-supabase', // Contraseña de Supabase
    database: 'postgres', // Nombre de la base de datos
    port: 6543, // Puerto de Supabase
    ssl: { rejectUnauthorized: true }, // SSL obligatorio para Supabase
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = { localDb, cloudDb };
