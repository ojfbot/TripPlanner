#!/bin/bash

# Security scan for API keys and secrets in staged files
# Run as pre-commit hook

echo "🔍 Running security scan on staged files..."

# Get list of staged files (TypeScript, JavaScript, JSON)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No staged files to scan"
  exit 0
fi

# Patterns to detect API keys and secrets
PATTERNS=(
  'sk-ant-'           # Anthropic API keys
  'sk-'               # OpenAI-style keys
  'secret_'           # Secret tokens
  'ghp_'              # GitHub personal access tokens
  'ANTHROPIC_API_KEY' # Environment variable references (in non-.env files)
  'OPENAI_API_KEY'
)

# Check for patterns in staged files
FOUND_SECRETS=false
for file in $STAGED_FILES; do
  for pattern in "${PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file"; then
      echo "❌ Found potential secret in $file: $pattern"
      FOUND_SECRETS=true
    fi
  done
done

# Check if env.json or .env files are staged
FORBIDDEN_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '(env\.json|\.env$|\.env\.local)')
if [ -n "$FORBIDDEN_FILES" ]; then
  echo "❌ Attempting to commit forbidden files:"
  echo "$FORBIDDEN_FILES"
  FOUND_SECRETS=true
fi

if [ "$FOUND_SECRETS" = true ]; then
  echo ""
  echo "🚨 SECURITY ISSUE DETECTED!"
  echo "Please remove secrets from your files before committing."
  echo "For API keys, use env.json or .env.local (gitignored)"
  exit 1
fi

echo "✅ Security scan passed"
exit 0
