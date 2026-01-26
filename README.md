<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Gym Tracker API

Backend service for the Gym Tracker application, built with [NestJS](https://github.com/nestjs/nest), PostgreSQL, and TypeORM.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Docker** & **Docker Compose** (Recommended for easy setup)
- **PostgreSQL** (If running locally without Docker)

## ⚙️ Configuration

1. Create a `.env` file in the root directory.
2. Add the required environment variables (see `.env.example` or use the reference below):

```env
# Server
PORT=3000

# Database
DATABASE_HOST=localhost   # 'postgres' if running inside Docker
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=gym_db

# JWT & Security
JWT_SECRET=your_super_secret_key
JWT_EXPIRATION=7d

# APIs
GEMINI_API_KEY=your_gemini_key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 🚀 Running the Project

### Option A: Using Docker (Recommended)

This will spin up the API, PostgreSQL database, and PgAdmin (database UI) in containerized environments.

```bash
# Start all services
docker-compose up --build

# Stop services
docker-compose down
```

- **API**: [http://localhost:3000/api](http://localhost:3000/api)
- **PgAdmin**: [http://localhost:5050](http://localhost:5050) (User/Pass configured in `docker-compose.yml`)

### Option B: Running Locally

1. **Start Database**: Ensure you have a PostgreSQL instance running and credentials match your `.env`.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Application**:

   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run start:prod
   ```

## 🛠️ Database Migrations

This project uses TypeORM Migrations. Automatic synchronization (`synchronize: true`) is **DISABLED** in production to prevent data loss.

### 1. Generate a Migration

When you modify an Entity (e.g., `user.entity.ts`), generate a migration file:

```bash
# Replace 'MigrationName' with a descriptive name (e.g., AddUserAge)
npm run migration:generate -- src/migrations/MigrationName
```

### 2. Run Migrations

Apply pending migrations to the database:

```bash
npm run migration:run
```

### 3. Revert Migrations

Undo the last applied migration:

```bash
npm run migration:revert
```

## 🚢 Production Deployment

To deploy this application to production:

1. **Build the Docker Image**:
   Use the provided `Dockerfile` which is optimized for production (multi-stage build).

   ```bash
   docker build -t gym-tracker-api .
   ```

2. **Run Container**:
   Ensure you pass the correct environment variables (especially DB credentials being different from `localhost`).

   ```bash
   docker run -d -p 3000:3000 --env-file .env gym-tracker-api
   ```

3. **Run Migrations**:
   Run migrations against the production database _before_ or _during_ startup. You can run them via the container:
   ```bash
   docker exec -it <container_id> npm run migration:run
   ```

## 🧪 Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
