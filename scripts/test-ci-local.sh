#!/bin/bash
# Script to test CI/CD pipeline locally before pushing
# This runs the same checks that GitHub Actions would run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Track failures
FAILURES=0

# Function to run a command and track failures
run_check() {
    local name="$1"
    shift
    print_info "Running: $name"
    if "$@"; then
        print_success "$name passed"
        return 0
    else
        print_error "$name failed"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

print_section "🧪 Local CI/CD Pipeline Test"
echo "This will run the same checks as GitHub Actions"
echo ""

# Check Node.js version
print_section "1. Checking Node.js version"
NODE_VERSION=$(node --version)
REQUIRED_VERSION="v20"

# Extract major version number
MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

# Check if version is >= 20
if [ "$MAJOR_VERSION" -ge 20 ] 2>/dev/null; then
    print_success "Node.js version: $NODE_VERSION (✓ >= $REQUIRED_VERSION)"
else
    print_error "Node.js version: $NODE_VERSION (requires >= $REQUIRED_VERSION)"
    FAILURES=$((FAILURES + 1))
fi

# Check npm version
NPM_VERSION=$(npm --version)
REQUIRED_NPM="10"
if [[ $(echo "$NPM_VERSION >= $REQUIRED_NPM" | bc -l 2>/dev/null || echo "0") == "1" ]]; then
    print_success "npm version: $NPM_VERSION (✓ >= $REQUIRED_NPM)"
else
    print_warning "npm version: $NPM_VERSION (recommended >= $REQUIRED_NPM)"
fi

# Install dependencies (if needed)
print_section "2. Checking dependencies"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_info "Installing dependencies..."
    if npm install; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies up to date"
fi

# Lint check
print_section "3. Running ESLint"
print_info "ESLint can take a while on large codebases..."
if timeout 60 npm run lint 2>&1 | tee /tmp/eslint-output.log; then
    print_success "ESLint passed"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        print_error "ESLint timed out after 60 seconds"
        print_warning "This might indicate performance issues. Consider running: npm run lint"
    else
        print_warning "Lint errors found. Fix them before pushing."
        print_info "See /tmp/eslint-output.log for details"
    fi
    FAILURES=$((FAILURES + 1))
fi

# Type check (if TypeScript)
print_section "4. Running TypeScript type check"
if run_check "TypeScript" npx tsc --noEmit; then
    : # Success
else
    print_warning "Type errors found. Fix them before pushing."
fi

# Build check
print_section "5. Running build"
if run_check "Build" npm run build; then
    : # Success
else
    print_error "Build failed. This will fail in CI/CD."
fi

# Unit tests
print_section "6. Running unit tests"
if run_check "Unit tests" npm run test:unit; then
    : # Success
else
    print_warning "Unit tests failed. Fix them before pushing."
fi

# Integration tests
print_section "7. Running integration tests"
if [ -d "tests/integration" ] && [ "$(ls -A tests/integration/*.ts 2>/dev/null)" ]; then
    if run_check "Integration tests" npm run test:integration; then
        : # Success
    else
        print_warning "Integration tests failed. Some may require external services."
    fi
else
    print_info "No integration tests found, skipping..."
fi

# Security tests
print_section "8. Running security tests"
if [ -d "tests/security" ] && [ "$(ls -A tests/security/*.ts 2>/dev/null)" ]; then
    if run_check "Security tests" npm run test:security; then
        : # Success
    else
        print_warning "Security tests failed."
    fi
else
    print_info "No security tests found, skipping..."
fi

# Security audit
print_section "9. Running security audit"
if run_check "Security audit" npm audit --audit-level=moderate; then
    : # Success
else
    print_warning "Security vulnerabilities found. Review them before pushing."
fi

# Performance tests (optional, can be slow)
print_section "10. Running performance tests (optional)"
if [ -d "tests/performance" ] && [ "$(ls -A tests/performance/*.ts 2>/dev/null)" ]; then
    print_info "Performance tests can be slow. Skipping for quick check."
    print_info "Run manually with: npm run test:performance"
else
    print_info "No performance tests found, skipping..."
fi

# E2E tests (optional, requires Playwright setup)
print_section "11. E2E tests (skipped - requires Playwright setup)"
print_info "E2E tests are skipped in local check (require browser setup)"
print_info "Run manually with: npm run test:e2e"

# Summary
print_section "📊 Test Summary"
if [ $FAILURES -eq 0 ]; then
    print_success "All checks passed! ✓"
    echo ""
    print_info "You can safely push to GitHub."
    echo ""
    exit 0
else
    print_error "$FAILURES check(s) failed"
    echo ""
    print_warning "Please fix the issues above before pushing to GitHub."
    echo ""
    print_info "To push anyway (not recommended):"
    echo "  git push --no-verify"
    echo ""
    exit 1
fi

