#!/bin/bash

###############################################################################
# Stripe Collection Module Deployment Script
#
# This script automates the deployment process to the Root Platform.
#
# Usage:
#   ./scripts/deploy.sh [environment] [version]
#
# Examples:
#   ./scripts/deploy.sh sandbox          # Deploy to sandbox (no version tag)
#   ./scripts/deploy.sh sandbox v1.0.0   # Deploy to sandbox with tag
#   ./scripts/deploy.sh production v1.0.0  # Deploy to production with tag
#
# Prerequisites:
#   - ROOT_API_KEY environment variable (or use -k flag)
#   - ROOT_ORG_ID environment variable (or use -o flag)
#   - ROOT_HOST environment variable (or use -h flag)
#   - CM_KEY environment variable (or use -c flag)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT=""
VERSION=""
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_TAG=false
DRY_RUN=false

# Root Platform configuration
ROOT_API_KEY="${ROOT_API_KEY:-}"
ROOT_ORG_ID="${ROOT_ORG_ID:-}"
ROOT_HOST="${ROOT_HOST:-https://api.rootplatform.com}"
CM_KEY="${CM_KEY:-cm_stripe}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_usage() {
    cat << EOF
Usage: $0 [OPTIONS] <environment> [version]

Deployment script for Stripe Collection Module to Root Platform.

Arguments:
    environment     Target environment: 'sandbox' or 'production'
    version         Git tag version (e.g., v1.0.0) - optional for sandbox

Options:
    -k, --api-key KEY       Root Platform API key (or set ROOT_API_KEY env var)
    -o, --org-id ID         Root organization ID (or set ROOT_ORG_ID env var)
    -h, --host URL          Root Platform host (default: https://api.rootplatform.com)
    -c, --cm-key KEY        Collection module key (default: cm_stripe)
    --skip-tests            Skip running tests
    --skip-build            Skip build step
    --skip-tag              Skip creating git tag
    --dry-run               Show what would be done without executing
    --help                  Show this help message

Examples:
    # Deploy to sandbox
    $0 sandbox

    # Deploy to sandbox with version tag
    $0 sandbox v1.0.0

    # Deploy to production with explicit credentials
    $0 -k "prod_key_123" -o "org_id" production v1.1.0

    # Dry run for production
    $0 --dry-run production v1.0.0

Environment Variables:
    ROOT_API_KEY    Root Platform API key
    ROOT_ORG_ID     Root organization ID
    ROOT_HOST       Root Platform API URL
    CM_KEY          Collection module key

EOF
}

###############################################################################
# Parse Arguments
###############################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -k|--api-key)
            ROOT_API_KEY="$2"
            shift 2
            ;;
        -o|--org-id)
            ROOT_ORG_ID="$2"
            shift 2
            ;;
        -h|--host)
            ROOT_HOST="$2"
            shift 2
            ;;
        -c|--cm-key)
            CM_KEY="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tag)
            SKIP_TAG=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        sandbox|production)
            ENVIRONMENT="$1"
            shift
            ;;
        v*.*.*)
            VERSION="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

###############################################################################
# Validate Arguments
###############################################################################

if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment argument is required (sandbox or production)"
    print_usage
    exit 1
fi

if [ "$ENVIRONMENT" != "sandbox" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT (must be 'sandbox' or 'production')"
    exit 1
fi

if [ "$ENVIRONMENT" = "production" ] && [ -z "$VERSION" ]; then
    print_error "Version is required for production deployment"
    print_info "Usage: $0 production v1.0.0"
    exit 1
fi

if [ -z "$ROOT_API_KEY" ]; then
    print_error "ROOT_API_KEY is not set"
    print_info "Set via environment variable or use -k flag"
    exit 1
fi

if [ -z "$ROOT_ORG_ID" ]; then
    print_error "ROOT_ORG_ID is not set"
    print_info "Set via environment variable or use -o flag"
    exit 1
fi

###############################################################################
# Display Configuration
###############################################################################

print_header "Deployment Configuration"

echo "Environment:     $ENVIRONMENT"
echo "Version:         ${VERSION:-<none>}"
echo "Root Host:       $ROOT_HOST"
echo "Organization ID: $ROOT_ORG_ID"
echo "Module Key:      $CM_KEY"
echo "API Key:         ${ROOT_API_KEY:0:10}..."
echo ""
echo "Skip Tests:      $SKIP_TESTS"
echo "Skip Build:      $SKIP_BUILD"
echo "Skip Tag:        $SKIP_TAG"
echo "Dry Run:         $DRY_RUN"

if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
fi

###############################################################################
# Confirmation
###############################################################################

if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = false ]; then
    echo ""
    print_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
fi

###############################################################################
# Pre-deployment Checks
###############################################################################

print_header "Pre-deployment Checks"

# Check if we're in the right directory
cd "$PROJECT_DIR"
print_success "Changed to project directory: $PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_error "node_modules not found. Run 'npm install' first."
    exit 1
fi
print_success "Dependencies installed"

# Check if git repository (if version tagging is needed)
if [ -n "$VERSION" ] && [ "$SKIP_TAG" = false ]; then
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Cannot create version tag."
        exit 1
    fi
    print_success "Git repository detected"
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes"
        read -p "Continue anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            exit 0
        fi
    fi
fi

###############################################################################
# Validation
###############################################################################

print_header "Step 1: Validate Configuration"

if [ "$DRY_RUN" = false ]; then
    if npm run validate; then
        print_success "Configuration validated"
    else
        print_error "Configuration validation failed"
        exit 1
    fi
else
    print_info "Would run: npm run validate"
fi

###############################################################################
# Run Tests
###############################################################################

if [ "$SKIP_TESTS" = false ]; then
    print_header "Step 2: Run Tests"
    
    if [ "$DRY_RUN" = false ]; then
        if npm test; then
            print_success "All tests passed"
        else
            print_error "Tests failed"
            exit 1
        fi
    else
        print_info "Would run: npm test"
    fi
else
    print_header "Step 2: Run Tests"
    print_warning "Skipping tests (--skip-tests flag)"
fi

###############################################################################
# Lint Code
###############################################################################

print_header "Step 3: Lint Code"

if [ "$DRY_RUN" = false ]; then
    if npm run lint; then
        print_success "Code linting passed"
    else
        print_error "Linting failed"
        print_info "Run 'npm run lint:fix' to auto-fix issues"
        exit 1
    fi
else
    print_info "Would run: npm run lint"
fi

###############################################################################
# Build
###############################################################################

if [ "$SKIP_BUILD" = false ]; then
    print_header "Step 4: Build"
    
    if [ "$DRY_RUN" = false ]; then
        if npm run build; then
            print_success "Build completed successfully"
        else
            print_error "Build failed"
            exit 1
        fi
    else
        print_info "Would run: npm run build"
    fi
else
    print_header "Step 4: Build"
    print_warning "Skipping build (--skip-build flag)"
fi

###############################################################################
# Create Git Tag
###############################################################################

if [ -n "$VERSION" ] && [ "$SKIP_TAG" = false ]; then
    print_header "Step 5: Create Git Tag"
    
    # Check if tag already exists
    if git rev-parse "$VERSION" >/dev/null 2>&1; then
        print_warning "Tag $VERSION already exists"
        read -p "Continue with existing tag? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            exit 0
        fi
    else
        if [ "$DRY_RUN" = false ]; then
            git tag -a "$VERSION" -m "Release $VERSION"
            print_success "Created tag: $VERSION"
            
            read -p "Push tag to remote? (yes/no): " -r
            if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                git push origin "$VERSION"
                print_success "Pushed tag to remote"
            fi
        else
            print_info "Would create tag: $VERSION"
            print_info "Would push tag to remote (if confirmed)"
        fi
    fi
elif [ -n "$VERSION" ]; then
    print_header "Step 5: Create Git Tag"
    print_warning "Skipping git tag (--skip-tag flag)"
fi

###############################################################################
# Publish to Root Platform
###############################################################################

print_header "Step 6: Publish to Root Platform"

# Determine if sandbox or production
if [ "$ENVIRONMENT" = "sandbox" ]; then
    BUMP_SANDBOX="true"
else
    BUMP_SANDBOX="false"
fi

# Build the API URL
API_URL="${ROOT_HOST}/v1/apps/${ROOT_ORG_ID}/insurance/collection-modules/${CM_KEY}/publish?bumpSandbox=${BUMP_SANDBOX}"

print_info "Publishing to: $ENVIRONMENT"
print_info "API URL: $API_URL"

if [ "$DRY_RUN" = false ]; then
    # Make the API call
    RESPONSE=$(curl -X POST \
        -H "Authorization: Basic ${ROOT_API_KEY}" \
        -w "\nHTTP_STATUS:%{http_code}" \
        -s \
        "$API_URL")
    
    # Extract HTTP status code
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
    
    # Check response
    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
        print_success "Successfully published to $ENVIRONMENT!"
        echo ""
        echo "Response:"
        echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    else
        print_error "Deployment failed with status: $HTTP_STATUS"
        echo ""
        echo "Response:"
        echo "$RESPONSE_BODY"
        exit 1
    fi
else
    print_info "Would execute: curl -X POST -H 'Authorization: Basic ***' '$API_URL'"
fi

###############################################################################
# Post-deployment Steps
###############################################################################

print_header "Post-deployment"

echo ""
print_success "Deployment to $ENVIRONMENT completed successfully!"
echo ""

if [ "$DRY_RUN" = false ]; then
    print_info "Next steps:"
    echo "  1. Verify deployment in Root Platform dashboard"
    echo "  2. Check logs for any errors"
    echo "  3. Test critical workflows"
    echo "  4. Monitor error rates and performance"
    
    if [ "$ENVIRONMENT" = "sandbox" ]; then
        echo ""
        print_info "After testing in sandbox, deploy to production with:"
        echo "  ./scripts/deploy.sh production $VERSION"
    fi
else
    print_info "This was a dry run. No changes were made."
    print_info "Remove --dry-run flag to execute deployment."
fi

echo ""
print_success "Done! 🚀"
echo ""

