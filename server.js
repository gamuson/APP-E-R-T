const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { cloudDb } = require('./db'); // Asegúrate de que está conectado a Supabase
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'secret-key';

// Middleware
app.use(express.json()); // Procesa solicitudes JSON
app.use(cors()); // Permite solicitudes entre dominios

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente.');
});

// Ruta de registro de usuarios
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await cloudDb.promise().query(
            'INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error al registrar el usuario.' });
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
