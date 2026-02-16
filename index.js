// index.js
import express from 'express'
import dotenv from 'dotenv'
// import db from './config/db.js'
// import routes from './routes/authRoutes.js';
import routes from './routes/authRoutes.js'

const app = express();
app.use(express.json());
app.use('/api/auth', routes)
dotenv.config();
// db();


app.get("/", (req, res) => {
    res.send("Wellcome from backend")
})
const PORT = 3000
app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});


