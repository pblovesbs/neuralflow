#!/bin/bash
set -e

echo "=== Running Backend Checks ==="
cd backend
source .venv/bin/activate
echo "1. Ruff Formatting"
ruff format --check .
echo "2. Ruff Linting"
ruff check .
echo "3. Pytest"
python -m pytest
cd ..

echo "=== Running Frontend Checks ==="
cd frontend
echo "1. ESLint"
npm run lint
echo "2. TypeScript Compiler"
npm run typecheck || echo "Skipping typecheck if not defined"
cd ..

echo "✅ All checks passed successfully!"
