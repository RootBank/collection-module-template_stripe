#!/bin/bash

# Collection Module Template Setup Script
# This script helps you set up the template after cloning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Required Node version
REQUIRED_NODE_VERSION="18"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stripe Collection Module Template - Setup Wizard     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "stripe_collection_module/package.json" ]; then
  echo -e "${RED}❌ Error: This script must be run from the template root directory${NC}"
  exit 1
fi

# Function to prompt with default value
prompt_with_default() {
  local prompt="$1"
  local default="$2"
  local value
  
  if [ -n "$default" ]; then
    read -p "$prompt [$default]: " value
    echo "${value:-$default}"
  else
    read -p "$prompt: " value
    echo "$value"
  fi
}

# Function to prompt for required value
prompt_required() {
  local prompt="$1"
  local value
  
  while [ -z "$value" ]; do
    read -p "$prompt: " value
    if [ -z "$value" ]; then
      echo -e "${RED}❌ This value is required${NC}"
    fi
  done
  
  echo "$value"
}

# Function to prompt for password/secret (no echo)
prompt_secret() {
  local prompt="$1"
  local value
  
  while [ -z "$value" ]; do
    read -s -p "$prompt: " value
    echo ""
    if [ -z "$value" ]; then
      echo -e "${RED}❌ This value is required${NC}"
    fi
  done
  
  echo "$value"
}

# ============================================================================
# Step 1: Check and setup Node.js version
# ============================================================================
echo -e "${YELLOW}🔧 Step 1: Checking Node.js version...${NC}"

CURRENT_NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)

if [ -z "$CURRENT_NODE_VERSION" ]; then
  echo -e "${RED}❌ Node.js is not installed${NC}"
  echo -e "${BLUE}ℹ️  Please install Node.js ${REQUIRED_NODE_VERSION}.x first${NC}"
  echo -e "${BLUE}ℹ️  Recommended: Install nvm (Node Version Manager)${NC}"
  echo -e "${CYAN}   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash${NC}"
  exit 1
fi

if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  echo -e "${RED}❌ Node.js version ${CURRENT_NODE_VERSION}.x detected${NC}"
  echo -e "${RED}❌ Node.js ${REQUIRED_NODE_VERSION}.x or higher is required${NC}"
  
  # Check if nvm is available
  if command -v nvm &> /dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
    echo -e "${BLUE}ℹ️  NVM detected. Attempting to install and use Node.js ${REQUIRED_NODE_VERSION}...${NC}"
    
    # Load nvm if not already loaded
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install and use the required version
    nvm install "$REQUIRED_NODE_VERSION"
    nvm use "$REQUIRED_NODE_VERSION"
    
    echo -e "${GREEN}✓ Now using Node.js $(node -v)${NC}"
  else
    echo -e "${BLUE}ℹ️  Please install Node.js ${REQUIRED_NODE_VERSION}.x or use nvm${NC}"
    exit 1
  fi
elif [ "$CURRENT_NODE_VERSION" -ne "$REQUIRED_NODE_VERSION" ]; then
  echo -e "${YELLOW}⚠️  Node.js version ${CURRENT_NODE_VERSION}.x detected${NC}"
  echo -e "${YELLOW}⚠️  Node.js ${REQUIRED_NODE_VERSION}.x is recommended${NC}"
  
  # Check if nvm is available
  if command -v nvm &> /dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
    read -p "Switch to Node.js ${REQUIRED_NODE_VERSION}.x using nvm? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      
      nvm install "$REQUIRED_NODE_VERSION" 2>/dev/null || true
      nvm use "$REQUIRED_NODE_VERSION"
      
      echo -e "${GREEN}✓ Now using Node.js $(node -v)${NC}"
    fi
  fi
else
  echo -e "${GREEN}✓ Node.js ${CURRENT_NODE_VERSION}.x detected (required: ${REQUIRED_NODE_VERSION}.x)${NC}"
fi

# Ensure nvm use is called in the stripe_collection_module directory
cd stripe_collection_module
if [ -f ".nvmrc" ]; then
  if command -v nvm &> /dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 2>/dev/null || echo -e "${YELLOW}⚠️  Could not automatically switch Node version${NC}"
  fi
fi
echo ""

# ============================================================================
# Step 2: Check for Root Platform CLI (rp)
# ============================================================================
echo -e "${YELLOW}🔧 Step 2: Checking Root Platform CLI...${NC}"

if command -v rp &> /dev/null; then
  echo -e "${GREEN}✓ Root Platform CLI (rp) is installed${NC}"
  rp --version 2>/dev/null || echo -e "${BLUE}ℹ️  rp version info not available${NC}"
else
  echo -e "${YELLOW}⚠️  Root Platform CLI (rp) not found${NC}"
  echo -e "${BLUE}ℹ️  The rp CLI is required for deploying Collection Modules${NC}"
  
  read -p "Install Root Platform CLI globally? (y/n) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Installing root-platform-cli globally...${NC}"
    npm install -g root-platform-cli
    
    if command -v rp &> /dev/null; then
      echo -e "${GREEN}✓ Root Platform CLI installed successfully${NC}"
      rp --version 2>/dev/null || true
    else
      echo -e "${RED}❌ Installation failed. Please install manually:${NC}"
      echo -e "${CYAN}   npm install -g root-platform-cli${NC}"
      echo -e "${YELLOW}⚠️  Continuing setup, but deployment will require rp CLI${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Skipping rp CLI installation${NC}"
    echo -e "${BLUE}ℹ️  You can install it later with: npm install -g root-platform-cli${NC}"
  fi
fi
echo ""

# ============================================================================
# Step 3: Install dependencies
# ============================================================================
echo -e "${YELLOW}📦 Step 3: Installing dependencies...${NC}"
if command -v npm &> /dev/null; then
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
  exit 1
fi
echo ""

# ============================================================================
# Step 4: Configure Root Platform settings (.root-config.json)
# ============================================================================
echo -e "${YELLOW}🔑 Step 4: Configuring Root Platform...${NC}"
echo ""

# Check if .root-config.json needs setup
if [ ! -f ".root-config.json" ]; then
  echo -e "${RED}❌ .root-config.json not found${NC}"
  exit 1
fi

# Check if this is the default template config
if grep -q "my_collection_module_cm_stripe\|test_cm" .root-config.json 2>/dev/null; then
  echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║  Root Platform Configuration                          ║${NC}"
  echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${CYAN}Please provide the following Root Platform settings:${NC}"
  echo ""
  
  # Prompt for configuration values
  cm_key=$(prompt_required "Collection Module Key (e.g., cm_stripe_yourcompany)")
  cm_name=$(prompt_required "Collection Module Name (e.g., Your Company Stripe Integration)")
  org_id=$(prompt_required "Organization ID")
  host=$(prompt_with_default "Root Platform Host" "https://api.rootplatform.com")
  
  # Update .root-config.json
  cat > .root-config.json << EOF
{
  "collectionModuleKey": "${cm_key}",
  "collectionModuleName": "${cm_name}",
  "organizationId": "${org_id}",
  "host": "${host}",
  "settings": {
    "legacyCodeExecution": false
  },
  "manualTransactions": []
}
EOF
  echo ""
  echo -e "${GREEN}✓ Created .root-config.json${NC}"
else
  echo -e "${GREEN}✓ .root-config.json already configured${NC}"
fi

# Set up .root-auth
echo ""
if [ ! -f ".root-auth" ]; then
  echo -e "${CYAN}Root Platform API Key Configuration:${NC}"
  echo -e "${BLUE}ℹ️  Get this from: Root Platform → Settings → API Keys${NC}"
  api_key=$(prompt_secret "Root Platform API Key")
  echo "ROOT_API_KEY=${api_key}" > .root-auth
  echo -e "${GREEN}✓ Created .root-auth${NC}"
  echo -e "${BLUE}ℹ️  This file is gitignored for security${NC}"
else
  echo -e "${GREEN}✓ .root-auth already exists${NC}"
fi
echo ""

# ============================================================================
# Step 5: Set up environment configuration (code/env.ts)
# ============================================================================
echo -e "${YELLOW}⚙️  Step 5: Setting up environment configuration...${NC}"
echo ""

# Check if env.ts already exists
if [ -f "code/env.ts" ]; then
  echo -e "${BLUE}ℹ️  code/env.ts already exists${NC}"
  read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✓ Keeping existing code/env.ts${NC}"
    echo ""
  else
    rm code/env.ts
  fi
fi

if [ ! -f "code/env.ts" ]; then
  echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║  Environment Configuration                            ║${NC}"
  echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${CYAN}Please provide the following configuration values:${NC}"
  echo ""
  
  # Environment
  echo -e "${YELLOW}Environment Settings:${NC}"
  node_env=$(prompt_with_default "NODE_ENV (development/production)" "development")
  echo ""
  
  # Stripe Webhook Secrets
  echo -e "${YELLOW}Stripe Webhook Signing Secrets:${NC}"
  echo -e "${BLUE}ℹ️  Get from: Stripe Dashboard → Developers → Webhooks → Signing secret${NC}"
  stripe_webhook_secret_sandbox=$(prompt_with_default "Stripe Webhook Signing Secret (SANDBOX)" "whsec_xxxxx")
  stripe_webhook_secret_production=$(prompt_with_default "Stripe Webhook Signing Secret (PRODUCTION)" "whsec_xxxxx")
  echo ""
  
  # Stripe Product IDs
  echo -e "${YELLOW}Stripe Product IDs:${NC}"
  echo -e "${BLUE}ℹ️  Get from: Stripe Dashboard → Products${NC}"
  stripe_product_id_sandbox=$(prompt_with_default "Stripe Product ID (SANDBOX)" "prod_xxxxx")
  stripe_product_id_production=$(prompt_with_default "Stripe Product ID (PRODUCTION)" "prod_xxxxx")
  echo ""
  
  # Stripe Publishable Keys
  echo -e "${YELLOW}Stripe API Keys - Publishable (Public):${NC}"
  echo -e "${BLUE}ℹ️  Get from: Stripe Dashboard → Developers → API keys${NC}"
  stripe_publishable_key_sandbox=$(prompt_with_default "Stripe Publishable Key (SANDBOX)" "pk_test_xxxxx")
  stripe_publishable_key_production=$(prompt_with_default "Stripe Publishable Key (PRODUCTION)" "pk_live_xxxxx")
  echo ""
  
  # Stripe Secret Keys
  echo -e "${YELLOW}Stripe API Keys - Secret (Private):${NC}"
  echo -e "${BLUE}ℹ️  Get from: Stripe Dashboard → Developers → API keys${NC}"
  echo -e "${RED}⚠️  NEVER expose these publicly!${NC}"
  stripe_secret_key_sandbox=$(prompt_with_default "Stripe Secret Key (SANDBOX)" "sk_test_xxxxx")
  stripe_secret_key_production=$(prompt_with_default "Stripe Secret Key (PRODUCTION)" "sk_live_xxxxx")
  echo ""
  
  # Root Configuration
  echo -e "${YELLOW}Root Platform Configuration:${NC}"
  # Use the cm_key from .root-config.json if it exists
  if [ -n "$cm_key" ]; then
    root_collection_module_key="$cm_key"
    echo -e "${BLUE}ℹ️  Using Collection Module Key from .root-config.json: ${root_collection_module_key}${NC}"
  else
    root_collection_module_key=$(prompt_with_default "Root Collection Module Key (must match .root-config.json)" "my_collection_module_cm_stripe")
  fi
  echo ""
  
  echo -e "${YELLOW}Root API Keys:${NC}"
  echo -e "${BLUE}ℹ️  Get from: Root Platform → Settings → API Keys${NC}"
  root_api_key_sandbox=$(prompt_with_default "Root API Key (SANDBOX)" "sandbox_xxxxx")
  root_api_key_production=$(prompt_with_default "Root API Key (PRODUCTION)" "production_xxxxx")
  echo ""
  
  echo -e "${YELLOW}Root API Base URLs:${NC}"
  root_base_url_sandbox=$(prompt_with_default "Root Base URL (SANDBOX)" "https://sandbox.rootplatform.com/v1/insurance")
  root_base_url_production=$(prompt_with_default "Root Base URL (PRODUCTION)" "https://api.rootplatform.com/v1/insurance")
  echo ""
  
  # Optional Configuration
  echo -e "${YELLOW}Optional Configuration:${NC}"
  time_delay=$(prompt_with_default "Time delay for processing in milliseconds" "10000")
  echo ""
  
  # Generate env.ts file
  cat > code/env.ts << EOF
/**
 * Environment Configuration
 *
 * IMPORTANT: Never commit this file to version control!
 * The .gitignore file should exclude it.
 *
 * Generated by setup.sh on $(date)
 */

// ============================================================================
// ENVIRONMENT
// ============================================================================
export const NODE_ENV = '${node_env}';

// ============================================================================
// PAYMENT PROVIDER CONFIGURATION (Stripe)
// ============================================================================

// Webhook Signing Secrets
export const STRIPE_WEBHOOK_SIGNING_SECRET_LIVE = '${stripe_webhook_secret_production}';
export const STRIPE_WEBHOOK_SIGNING_SECRET_TEST = '${stripe_webhook_secret_sandbox}';

// Product IDs
export const STRIPE_PRODUCT_ID_LIVE = '${stripe_product_id_production}';
export const STRIPE_PRODUCT_ID_TEST = '${stripe_product_id_sandbox}';

// API Keys - Publishable (Public)
export const STRIPE_PUBLISHABLE_KEY_LIVE = '${stripe_publishable_key_production}';
export const STRIPE_PUBLISHABLE_KEY_TEST = '${stripe_publishable_key_sandbox}';

// API Keys - Secret (Private)
// NEVER expose these publicly!
export const STRIPE_SECRET_KEY_LIVE = '${stripe_secret_key_production}';
export const STRIPE_SECRET_KEY_TEST = '${stripe_secret_key_sandbox}';

// ============================================================================
// ROOT PLATFORM CONFIGURATION
// ============================================================================

// Collection Module Key
export const ROOT_COLLECTION_MODULE_KEY = '${root_collection_module_key}';

// Root API Keys
export const ROOT_API_KEY_LIVE = '${root_api_key_production}';
export const ROOT_API_KEY_SANDBOX = '${root_api_key_sandbox}';

// Root API Base URLs
export const ROOT_BASE_URL_LIVE = '${root_base_url_production}';
export const ROOT_BASE_URL_SANDBOX = '${root_base_url_sandbox}';

// ============================================================================
// OPTIONAL CONFIGURATION
// ============================================================================

export const TIME_DELAY_IN_MILLISECONDS = '${time_delay}';
EOF

  echo -e "${GREEN}✓ Created code/env.ts with your configuration${NC}"
  echo -e "${RED}⚠️  Remember: Never commit code/env.ts to version control!${NC}"
else
  echo -e "${GREEN}✓ code/env.ts already exists and configured${NC}"
fi
echo ""

# ============================================================================
# Step 6: Run validation
# ============================================================================
echo -e "${YELLOW}✓ Step 6: Running validation checks...${NC}"
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${YELLOW}⚠️  Linting has warnings (this is normal for a template)${NC}"
fi

if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed - please check your configuration${NC}"
  echo -e "${BLUE}ℹ️  You may need to review code/env.ts and .root-config.json${NC}"
fi
echo ""

# ============================================================================
# Step 7: Summary and Next Steps
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Setup Complete! 🎉                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo -e "  ${CYAN}✓${NC} Node.js version: $(node -v)"
if command -v rp &> /dev/null; then
  echo -e "  ${CYAN}✓${NC} Root Platform CLI (rp) installed"
else
  echo -e "  ${YELLOW}⚠${NC} Root Platform CLI (rp) not installed"
fi
echo -e "  ${CYAN}✓${NC} Dependencies installed"
echo -e "  ${CYAN}✓${NC} .root-config.json configured"
echo -e "  ${CYAN}✓${NC} .root-auth configured"
echo -e "  ${CYAN}✓${NC} code/env.ts configured"
echo ""
echo -e "${YELLOW}Files Created/Updated:${NC}"
echo -e "  ${BLUE}→${NC} ${CYAN}stripe_collection_module/.root-config.json${NC}"
echo -e "  ${BLUE}→${NC} ${CYAN}stripe_collection_module/.root-auth${NC}"
echo -e "  ${BLUE}→${NC} ${CYAN}stripe_collection_module/code/env.ts${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo -e "${CYAN}1. Before running commands, ensure correct Node version:${NC}"
echo -e "   ${YELLOW}cd stripe_collection_module && nvm use${NC}"
echo ""

# Show rp CLI installation reminder if not installed
if ! command -v rp &> /dev/null; then
  echo -e "${CYAN}2. Install Root Platform CLI (required for deployment):${NC}"
  echo -e "   ${YELLOW}npm install -g root-platform-cli${NC}"
  echo ""
  STEP_OFFSET=1
else
  STEP_OFFSET=0
fi

echo -e "${CYAN}$((2 + STEP_OFFSET)). Review and customize your code:${NC}"
echo -e "   ${BLUE}→${NC} Implement controllers in ${YELLOW}code/controllers/${NC}"
echo -e "   ${BLUE}→${NC} Add your business logic to services"
echo -e "   ${BLUE}→${NC} Update ${YELLOW}README.md${NC} with your module details"
echo ""
echo -e "${CYAN}$((3 + STEP_OFFSET)). Development commands:${NC}"
echo -e "   ${YELLOW}npm run lint${NC}              - Check code quality"
echo -e "   ${YELLOW}npm run test${NC}              - Run tests"
echo -e "   ${YELLOW}npm run test:integration${NC}  - Run integration tests"
echo -e "   ${YELLOW}npm run build${NC}             - Build the module"
echo ""
echo -e "${CYAN}$((4 + STEP_OFFSET)). Deploy when ready:${NC}"
echo -e "   ${BLUE}→${NC} Deployment uses ${YELLOW}rp push${NC} followed by publish"
echo -e "   ${YELLOW}npm run deploy:sandbox${NC}              - Deploy to sandbox"
echo -e "   ${YELLOW}npm run deploy:production${NC}           - Deploy to production"
echo -e "   ${YELLOW}npm run deploy:dry-run:sandbox${NC}      - Test deployment (sandbox)"
echo -e "   ${YELLOW}npm run deploy:dry-run:production${NC}   - Test deployment (production)"
echo ""
echo -e "${CYAN}$((5 + STEP_OFFSET)). Review documentation:${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/SETUP.md${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/DEPLOYMENT.md${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/CUSTOMIZING.md${NC}"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"
echo ""

