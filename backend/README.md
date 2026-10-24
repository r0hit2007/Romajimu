# Silent SOS — Production Backend

Production Node.js, Express, PostgreSQL, and Prisma ORM service powering the Silent SOS mobile application.

---

## 🛠 Technology Stack

- **Runtime**: Node.js (>= 18)
- **Framework**: Express.js
- **Database**: PostgreSQL (v15+)
- **ORM**: Prisma ORM
- **Authentication**: JWT (Access Token + Refresh Token Session Rotation)
- **Password Security**: Bcrypt with 12 salt rounds
- **Validation**: Joi schema validation
- **Protection**: Helmet HTTP headers, CORS origin verification, express-rate-limit

---

## 📂 Architecture & Directory Structure

```
backend/
├── docker-compose.yml          # One-command PostgreSQL service
├── .env.example                # Sample environment configuration
├── prisma/
│   ├── schema.prisma           # Prisma PostgreSQL schema
│   ├── seed.js                 # Initial seed for verified support resources
│   └── migrations/             # Versioned SQL migrations
│       └── 20261025000000_init/
│           └── migration.sql
└── src/
    ├── config/                 # Env validation & database initialization
    │   ├── env.js
    │   └── db.js
    ├── controllers/            # Request handlers
    │   ├── authController.js
    │   ├── contactController.js
    │   ├── sosController.js
    │   ├── resourceController.js
    │   └── aiController.js
    ├── middleware/             # Security, auth, and error handlers
    │   ├── authMiddleware.js
    │   ├── rateLimiter.js
    │   ├── validate.js
    │   └── errorHandler.js
    ├── routes/                 # Express route definitions
    │   ├── authRoutes.js
    │   ├── contactRoutes.js
    │   ├── sosRoutes.js
    │   ├── resourceRoutes.js
    │   ├── aiRoutes.js
    │   └── index.js
    ├── services/               # Core business logic
    │   ├── authService.js
    │   ├── contactService.js
    │   ├── sosService.js
    │   ├── resourceService.js
    │   └── aiService.js
    ├── utils/                  # Reusable utilities
    │   ├── hash.js
    │   ├── jwt.js
    │   ├── response.js
    │   └── validation.js
    ├── app.js                  # Express application setup
    └── server.js               # Server entry point
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start PostgreSQL with Docker
```bash
docker compose up -d
```

### 4. Apply Database Migrations & Generate Prisma Client
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start the Server
```bash
# Development (with nodemon auto-restart)
npm run dev

# Production
npm start
```

Server runs by default at `http://localhost:5000`.

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate with email & password | No |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new access token | No |
| `POST` | `/api/auth/forgot-password` | Reset password securely | No |
| `GET` | `/api/auth/me` | Fetch active user profile and settings | **Yes** |

### Emergency Contacts (`/api/contacts`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/contacts` | List user emergency contacts | **Yes** |
| `POST` | `/api/contacts` | Add new emergency contact | **Yes** |
| `PUT` | `/api/contacts/:id` | Update contact information | **Yes** |
| `DELETE` | `/api/contacts/:id` | Remove emergency contact | **Yes** |
| `PATCH` | `/api/contacts/:id/toggle-sos` | Toggle contact SOS dispatch state | **Yes** |
| `POST` | `/api/contacts/sync` | Batch sync offline contacts with server | **Yes** |

### SOS Operations (`/api/sos`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/sos/settings` | Retrieve user SOS settings | **Yes** |
| `PUT` | `/api/sos/settings` | Update countdown, custom message, region | **Yes** |
| `POST` | `/api/sos/alert` | Log emergency event in database history | **Yes** |
| `GET` | `/api/sos/history` | Retrieve user emergency history log | **Yes** |
| `POST` | `/api/sos/sync-queue` | Upload queued offline alerts to PostgreSQL | **Yes** |

### Support Resources (`/api/resources`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/resources?region=US` | Get verified regional hotlines & shelters | No |
| `GET` | `/api/resources/all` | List all verified international resources | No |

### AI Safety Service (`/api/ai`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/ai/draft-message` | Refine discreet emergency message (Gemma) | **Yes** |
| `GET` | `/api/ai/safety-tips` | Fetch regional safety planning tips | No |
