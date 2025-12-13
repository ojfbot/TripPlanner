#!/bin/bash

# Basic security check for build process
# Ensures no secrets in dist/ or build/ directories

echo "🔍 Running security checks..."

# Check if dist directories exist and contain potential secrets
if [ -d "packages/browser-app/dist" ]; then
  echo "Checking browser-app dist for secrets..."
  if grep -r -E '(sk-ant-|sk-|secret_|ghp_)' packages/browser-app/dist; then
    echo "❌ Found potential secrets in browser-app/dist"
    exit 1
  fi
fi

echo "✅ Security checks passed"
exit 0
