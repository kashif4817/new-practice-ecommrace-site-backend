# LUXE Store — Auth API

A production-ready authentication backend for the LUXE Store e-commerce platform. Built with Node.js, Express, and Supabase, deployed on Vercel.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Email | Nodemailer (Gmail SMTP) |
| Security | Helmet, express-rate-limit, xss, bcrypt |
| Deployment | Vercel |

## Features

- **Signup** — Register with name, email, phone, and password
- **Email OTP verification** — Verify email before completing signup
- **Signin** — Cookie-based JWT authentication with optional "remember me"
- **Refresh token rotation** — Hashed refresh tokens stored in DB, silently rotates access tokens
- **Logout** — Clears both HTTP-only cookies
- **Forgot password** — OTP sent to email to initiate reset
- **Reset password** — Authenticated endpoint to change password
- **Update password** — Direct password update post-OTP verification
- **Check email** — Real-time availability check during signup
- **Get current user** — Returns authenticated user's profile (`/me`)
- **Temp account blocking** — Blocks account for 15 minutes after 5 failed login attempts
- **Rate limiting** — 20 login attempts per 15-minute window per IP
- **XSS sanitization** — All request body strings sanitized on every request
- **Input validation** — Zod schemas enforce shape and rules before controllers run

## API Endpoints

All routes are prefixed with `/api/auth`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signup` | No | Register a new user |
| POST | `/signin` | No | Login and receive JWT cookies |
| POST | `/logout` | No | Clear auth cookies |
| POST | `/refresh-token` | No | Issue new access token via refresh token |
| POST | `/check-email` | No | Check if an email is already taken |
| POST | `/otp-sent-signup` | No | Send OTP to email for signup verification |
| POST | `/verify-otp-signup` | No | Verify signup OTP |
| POST | `/verify-email` | No | Send OTP to verify an existing account's email |
| POST | `/forget-password` | No | Send OTP to email for password reset |
| POST | `/verify-otp-forgot` | No | Verify forgot-password OTP |
| POST | `/reset-password` | Yes | Change password (requires current password) |
| POST | `/update-password` | No | Set new password after OTP verification |
| GET | `/me` | Yes | Get authenticated user's profile |

## Project Structure

```
├── api/
│   └── index.js              # Vercel serverless entry point
├── config/
│   ├── env.js                # Startup env variable validation
│   ├── rateLimiter.js        # express-rate-limit configs
│   └── supabase.js           # Supabase client
├── controllers/
│   └── authControllers.js    # All auth logic
├── emails/
│   ├── forgotPasswordTemplate.js
│   ├── signupOtpVerifyTemplate.js
│   └── verifyEmailTemplate.js
├── middleware/
│   ├── auth.middleware.js    # JWT verification
│   ├── checkTempBlock.js     # Account block check
│   ├── sanitize.js           # XSS sanitization
│   └── validate.js           # Zod schema validation
├── routes/
│   └── authRoutes.js
├── utils/
│   ├── sendEmail.js          # Nodemailer wrapper
│   └── sendResponse.js       # Consistent JSON response helper
├── validations/
│   └── auth.validation.js    # Zod schemas
├── index.js                  # Express app setup
├── vercel.json               # Vercel deployment config
└── .env.example
```

## Environment Variables

Copy `.env.example` and fill in your values:

```env
SUPABASE_URL=
SUPABASE_KEY=

JWT_SECRET=
JWT_EXPIRES_IN=
REFRESH_SECRET=
JWT_REFRESH_IN=

EMAIL_USER=
EMAIL_PASS=

NODE_ENV=
PORT=
```

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start
```

The server starts on `http://localhost:5000` by default (or the `PORT` env variable).

## Security Notes

- Access and refresh tokens are stored in `httpOnly`, `secure`, `SameSite=None` cookies — never exposed to JavaScript
- Refresh tokens are bcrypt-hashed before storing in the database
- Passwords are hashed with bcrypt (cost factor 12)
- All environment variables are validated at startup — the server won't start with missing config
