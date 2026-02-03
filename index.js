// index.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

// Use environment variables with fallbacks
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to the MySQL database!');
});

// Health check
app.get('/', (req, res) => {
    res.send('From backend side');
});

// Create user with validation
app.post('/users', (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const sql = 'INSERT INTO users (name, email) VALUES (?, ?)';
    db.query(sql, [name, email], (err, result) => {
        if (err) {
            console.error('DB insert error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }

        return res.status(201).json({ id: result.insertId, name, email });
    });
});

app.get('/users', (req, res) => {
    console.log("api hit")
    const sql = 'SELECT * FROM users;';
    db.query(sql, (err, result) => {
        if (err) {
            console.log('enter in if')
            console.err("Error while fetching users", err);
            return res.status(500).json({ error: "Failed to fetch users" });
        }
        console.log(result)
        res.status(200).json(result)
    });
});

app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    const sql = 'update  users set name = ?, email = ? where id = ?';

    db.query(sql, [name, email, id], (err, result) => {
        if (err) {
            console.error("error while updating", err);
            return res.status(500).send({ error: "Failed to update user" })
        }
        if (result.affectedRows === 0) {
         return res.status(404).json({error: " user not found" })
        }
        res.send({ id, name, email });
        // res.status(201).json(result);
    })
})


app.delete('/users/:id',(req,res)=>{
    const {id} = req.params;
    const sql = 'delete from users where id=?';
    db.query(sql,[id],(err,result)=>{
         if (err) {
            console.error("error while deleting user", err);
            return res.status(500).send({ error: "Failed to delete user" })
        }
        if (result.affectedRows === 0) {
         return res.status(404).json({error: " user not found" })
        }
        res.json('user deleted');
    })
})


// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    db.end(() => process.exit(0));
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});


