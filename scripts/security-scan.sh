#!/bin/bash

# Security scan for API keys and secrets in staged files
# Run as pre-commit hook

echo "🔍 Running security scan on staged files..."

# Get list of staged files (TypeScript, JavaScript, JSON)
# Exclude .example files to avoid false positives from template/documentation files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json)$' | grep -v '\.example')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No staged files to scan"
  exit 0
fi

# Strict patterns: detect actual API key values by format
PATTERNS=(
  'sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{95}'  # Anthropic API key format
  'sk-[A-Za-z0-9]{48}'                    # OpenAI-style keys (48 chars)
  'ghp_[A-Za-z0-9]{36}'                   # GitHub personal access tokens
  'sk_live_[A-Za-z0-9]{20,}'             # Stripe live secret keys
  'sk_test_[A-Za-z0-9]{20,}'             # Stripe test secret keys
  'secret_[A-Za-z0-9_-]{20,}'            # Generic secret-prefixed tokens (Slack, etc.)
  'xox[baprs]-[A-Za-z0-9-]{10,}'         # Slack OAuth tokens
)

# Broad patterns: catch variable assignments with inline values
# These catch shorter/partial/rotated keys that don't match strict length regexes
BROAD_PATTERNS=(
  'ANTHROPIC_API_KEY=['\''"]?[A-Za-z0-9_-]+'   # Anthropic key assignment
  'OPENAI_API_KEY=['\''"]?[A-Za-z0-9_-]+'       # OpenAI key assignment
  'secret_[A-Za-z0-9_-]+'                       # Any secret_-prefixed token
)

# Check for actual API key values in staged files
FOUND_SECRETS=false
for file in $STAGED_FILES; do
  for pattern in "${PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file"; then
      echo "❌ Found potential secret in $file (strict match): $pattern"
      FOUND_SECRETS=true
    fi
  done
  for pattern in "${BROAD_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file"; then
      echo "❌ Found potential secret in $file (broad match): $pattern"
      FOUND_SECRETS=true
    fi
  done
done

# Check if env.json or .env files are staged (but allow .example files)
FORBIDDEN_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '(env\.json|\.env$|\.env\.local)' | grep -v '\.example$')
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
