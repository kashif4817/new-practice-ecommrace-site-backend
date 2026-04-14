import morgan from 'morgan';
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import routes from './routes/authRoutes.js'
import { sanitizeInput } from './middleware/sanitize.js'
import { validateEnv } from './config/env.js'
import helmet from 'helmet'

dotenv.config();
validateEnv();

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeInput)
app.use('/api/auth', routes)

app.get('/', (req, res) => {
    res.send("Hello world!")
})

// ✅ Only listen locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;