#!/bin/bash

# Comprehensive security verification
# Checks for common security issues in the codebase

echo "🔍 Running comprehensive security verification..."

ISSUES_FOUND=false

# 1. Check for API keys in source files
echo "Checking for API keys in source code..."
if grep -r -E '(sk-ant-|sk-|secret_|ghp_)' packages/*/src --include='*.ts' --include='*.tsx' --include='*.js' 2>/dev/null; then
  echo "❌ Found potential API keys in source code"
  ISSUES_FOUND=true
fi

# 2. Check if gitignored files exist where they shouldn't
echo "Checking for gitignored files..."
if [ -f "packages/agent-core/env.json" ] && git check-ignore packages/agent-core/env.json >/dev/null 2>&1; then
  echo "✅ env.json is properly gitignored"
else
  if [ -f "packages/agent-core/env.json" ]; then
    echo "⚠️  env.json exists but may not be gitignored"
  fi
fi

# 3. Check for TODO security items
echo "Checking for security TODOs..."
if grep -r 'TODO.*security\|SECURITY.*TODO\|FIXME.*security' packages/*/src --include='*.ts' --include='*.tsx' 2>/dev/null; then
  echo "⚠️  Found security-related TODOs"
fi

# 4. Check if .env files are gitignored
if git check-ignore .env .env.local >/dev/null 2>&1; then
  echo "✅ .env files are properly gitignored"
else
  echo "⚠️  .env files may not be gitignored"
fi

if [ "$ISSUES_FOUND" = true ]; then
  echo ""
  echo "🚨 Security issues found! Please review above."
  exit 1
fi

echo ""
echo "✅ Security verification passed"
exit 0
