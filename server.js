const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { localDb, cloudDb } = require('./db');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'secret-key';

// Middleware
app.use(express.json());
app.use(cors());

// Rutas de Prueba
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente.');
});

// Registro de Usuarios
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await localDb.promise().query(
            'INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error al registrar el usuario.' });
    }
});

// Inicio de Sesión
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const [rows] = await localDb.promise().query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.contrasena);

        if (!isMatch) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            user: { id: user.id, name: user.nombre, email: user.email },
        });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
});

// Gestión de Reservas
app.get('/admin/reservations', async (req, res) => {
    try {
        const [reservations] = await localDb.promise().query(`
            SELECT r.id, r.fecha, r.horas, r.estado, u.nombre AS usuario, u.id AS usuario_id
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
        `);
        res.status(200).json(reservations);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ message: 'Error al obtener las reservas.' });
    }
});

app.post('/admin/reservations/cancel', async (req, res) => {
    const { reservationId } = req.body;

    if (!reservationId) {
        return res.status(400).json({ message: 'Se requiere el ID de la reserva.' });
    }

    try {
        await localDb.promise().query('DELETE FROM reservas WHERE id = ?', [reservationId]);
        res.status(200).json({ message: 'Reserva cancelada exitosamente.' });
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        res.status(500).json({ message: 'Error al cancelar la reserva.' });
    }
});

// Gestión de Códigos
app.post('/admin/codes/generate', async (req, res) => {
    const { valor } = req.body;

    if (!valor || valor <= 0) {
        return res.status(400).json({ message: 'El valor del código debe ser mayor a 0.' });
    }

    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
        await localDb.promise().query(
            'INSERT INTO codigos (codigo, valor, usado) VALUES (?, ?, ?)',
            [codigo, valor, false]
        );
        res.status(201).json({ message: 'Código generado exitosamente.', codigo });
    } catch (error) {
        console.error('Error al generar código:', error);
        res.status(500).json({ message: 'Error al generar el código.' });
    }
});

app.get('/admin/codes', async (req, res) => {
    try {
        const [codes] = await localDb.promise().query('SELECT * FROM codigos');
        res.status(200).json(codes);
    } catch (error) {
        console.error('Error al obtener códigos:', error);
        res.status(500).json({ message: 'Error al obtener los códigos.' });
    }
});

// Gestión de Mensajes
app.post('/admin/messages/send', async (req, res) => {
    const { userId, contenido } = req.body;

    if (!userId || !contenido) {
        return res.status(400).json({ message: 'Se requieren todos los campos.' });
    }

    try {
        await localDb.promise().query(
            'INSERT INTO mensajes (usuario_id, contenido, leido) VALUES (?, ?, ?)',
            [userId, contenido, false]
        );
        res.status(201).json({ message: 'Mensaje enviado exitosamente.' });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ message: 'Error al enviar el mensaje.' });
    }
});

app.get('/admin/messages/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [messages] = await localDb.promise().query(
            'SELECT * FROM mensajes WHERE usuario_id = ?',
            [userId]
        );
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ message: 'Error al obtener mensajes.' });
    }
});

// Sincronización Automática
cron.schedule('0 0 * * *', async () => {
    console.log('Sincronización automática iniciada.');

    try {
        const [localUsers] = await localDb.promise().query('SELECT * FROM usuarios');
        for (const user of localUsers) {
            const [cloudUsers] = await cloudDb.promise().query(
                'SELECT * FROM usuarios WHERE email = ?',
                [user.email]
            );

            if (cloudUsers.length === 0) {
                await cloudDb.promise().query(
                    'INSERT INTO usuarios (nombre, email, contrasena, tokens) VALUES (?, ?, ?, ?)',
                    [user.nombre, user.email, user.contrasena, user.tokens]
                );
            }
        }

        console.log('Sincronización automática completada.');
    } catch (error) {
        console.error('Error en la sincronización automática:', error);
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
