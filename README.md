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

## 🛠️ Database Migrations (Automated)

This project uses an **automated migration system** that combines the best of both worlds:

### 🔄 How It Works

#### Development Mode (Local)

- **`synchronize: true`** is enabled in development
- Database schema updates **automatically** when you modify entities
- No manual migration generation needed during development
- Fast iteration and prototyping ✅

#### Production/Deployment Mode

- **Pre-commit hook** automatically detects entity changes
- Generates migrations **before you commit**
- Migrations are version-controlled and safe for production
- Database changes are tracked and reversible ✅

### 📝 What You Need to Do

**During Development:**

```bash
# Just start Docker and code!
docker-compose up

# Modify your entities (e.g., add a new column)
# Database updates automatically - no action needed! 🎉
```

**Before Committing:**

```bash
# When you commit changes to entity files:
git add .
git commit -m "Added new field to User entity"

# The pre-commit hook will:
# 1. Detect entity changes
# 2. Auto-generate migration if needed
# 3. Add migration to your commit
# All automatic! ✅
```

### 🔧 Manual Migration Commands (Optional)

If you need to manually manage migrations:

```bash
# Check if migrations are needed
npm run migration:check

# Generate a migration manually
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### ⚠️ Important Notes

- **Development**: `synchronize: true` means your local DB updates automatically
- **Production**: Always uses migrations (synchronize is disabled)
- **Pre-commit hook**: Automatically generates migrations when you modify `.entity.ts` files
- **No manual work needed**: The system handles everything for you!

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
