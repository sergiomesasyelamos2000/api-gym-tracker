#!/bin/bash

# Pre-commit hook for automatic migration generation
# This script checks if entity files were modified and generates migrations if needed

echo "🔍 Checking for entity changes..."

# Check if any entity files were modified
ENTITY_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "\.entity\.ts$")

if [ -z "$ENTITY_FILES" ]; then
  echo "✅ No entity files modified, skipping migration check"
  exit 0
fi

echo "📝 Entity files modified:"
echo "$ENTITY_FILES"

# Run migration check
echo "🔄 Running migration check..."
node scripts/check-migrations.js

if [ $? -eq 0 ]; then
  # Check if new migration files were created
  NEW_MIGRATIONS=$(git status --porcelain | grep "src/migrations/.*\.ts$")
  
  if [ ! -z "$NEW_MIGRATIONS" ]; then
    echo "📦 Adding generated migrations to commit..."
    git add src/migrations/*.ts
    echo "✅ Migrations added to commit"
  fi
  
  exit 0
else
  echo "❌ Migration check failed"
  exit 1
fi
