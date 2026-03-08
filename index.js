// index.js
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import routes from './routes/authRoutes.js'

const app = express();
app.use(express.json());
app.use(cors())
app.use('/api/auth', routes)
dotenv.config();
// db();


app.get("/", (req, res) => {
    res.send("Wellcome from backend")
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));