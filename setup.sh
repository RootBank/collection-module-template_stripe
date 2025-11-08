#!/bin/bash

# Collection Module Template Setup Script
# This script helps you set up the template after cloning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stripe Collection Module Template - Setup Wizard     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "stripe_collection_module/package.json" ]; then
  echo -e "${RED}❌ Error: This script must be run from the template root directory${NC}"
  exit 1
fi

cd stripe_collection_module

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
if command -v npm &> /dev/null; then
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
  exit 1
fi
echo ""

# Step 2: Configure Root Platform settings
echo -e "${YELLOW}🔑 Step 2: Configuring Root Platform...${NC}"

# Check if .root-config.json needs setup
if [ ! -f ".root-config.json" ]; then
  echo -e "${RED}❌ .root-config.json not found${NC}"
  exit 1
fi

# Check if this is the default template config
if grep -q "my_collection_module_cm_stripe" .root-config.json 2>/dev/null; then
  echo -e "${BLUE}📝 Let's configure your Root Platform settings...${NC}"
  echo ""
  
  # Prompt for configuration values
  read -p "Collection Module Key (e.g., cm_stripe_yourcompany): " cm_key
  read -p "Collection Module Name (e.g., Your Company Stripe Integration): " cm_name
  read -p "Organization ID: " org_id
  read -p "Root Platform Host (default: https://api.rootplatform.com): " host
  host=${host:-https://api.rootplatform.com}
  
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
  echo -e "${GREEN}✓ Created .root-config.json${NC}"
else
  echo -e "${GREEN}✓ .root-config.json already configured${NC}"
fi

# Set up .root-auth
if [ ! -f ".root-auth" ]; then
  if [ -f ".root-auth.sample" ]; then
    echo ""
    read -p "Root Platform API Key (will be stored in .root-auth): " api_key
    echo "ROOT_API_KEY=${api_key}" > .root-auth
    echo -e "${GREEN}✓ Created .root-auth${NC}"
    echo -e "${BLUE}ℹ️  This file is gitignored for security${NC}"
  else
    echo -e "${YELLOW}⚠️  .root-auth.sample not found, skipping .root-auth creation${NC}"
  fi
else
  echo -e "${GREEN}✓ .root-auth already exists${NC}"
fi
echo ""

# Step 3: Set up environment configuration
echo -e "${YELLOW}⚙️  Step 3: Setting up code environment configuration...${NC}"
if [ ! -f "code/env.ts" ]; then
  cp code/env.sample.ts code/env.ts
  echo -e "${GREEN}✓ Created code/env.ts from template${NC}"
  echo -e "${BLUE}ℹ️  Please edit code/env.ts with your Stripe API keys and other configuration${NC}"
else
  echo -e "${BLUE}ℹ️  code/env.ts already exists, skipping...${NC}"
fi
echo ""

# Step 4: Set up .nvmrc (optional)
echo -e "${YELLOW}🔧 Step 4: Node.js version...${NC}"
if [ -f ".nvmrc" ]; then
  echo -e "${GREEN}✓ .nvmrc already configured${NC}"
  if command -v nvm &> /dev/null; then
    echo -e "${BLUE}ℹ️  Run 'nvm use' to switch to the correct Node.js version${NC}"
  fi
else
  echo -e "${BLUE}ℹ️  No .nvmrc found (optional)${NC}"
fi
echo ""

# Step 5: Run validation
echo -e "${YELLOW}✓ Step 5: Running validation checks...${NC}"
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${YELLOW}⚠️  Linting has warnings (this is normal for a template)${NC}"
fi

if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed - please check your setup${NC}"
fi
echo ""

# Step 6: Next steps
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Setup Complete! Next Steps:                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}1. Finish configuring your environment:${NC}"
echo -e "   ${BLUE}→${NC} Edit ${YELLOW}stripe_collection_module/code/env.ts${NC}"
echo -e "   ${BLUE}→${NC} Add your Stripe API keys and webhook secrets"
echo -e "   ${BLUE}→${NC} Verify ${YELLOW}stripe_collection_module/.root-config.json${NC}"
echo -e "   ${BLUE}→${NC} Verify ${YELLOW}stripe_collection_module/.root-auth${NC} has correct API key"
echo ""
echo -e "${GREEN}2. Customize for your use case:${NC}"
echo -e "   ${BLUE}→${NC} Update ${YELLOW}README.md${NC} with your module details"
echo -e "   ${BLUE}→${NC} Implement controllers in ${YELLOW}code/controllers/${NC}"
echo -e "   ${BLUE}→${NC} Add your business logic to services"
echo ""
echo -e "${GREEN}3. Review documentation:${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/SETUP.md${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/DEPLOYMENT.md${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}stripe_collection_module/docs/CUSTOMIZING.md${NC}"
echo ""
echo -e "${GREEN}4. Development commands:${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}npm run lint${NC}      - Check code quality"
echo -e "   ${BLUE}→${NC} ${YELLOW}npm run test${NC}      - Run tests"
echo -e "   ${BLUE}→${NC} ${YELLOW}npm run build${NC}     - Build the module"
echo ""
echo -e "${GREEN}5. Deploy when ready:${NC}"
echo -e "   ${BLUE}→${NC} ${YELLOW}npm run deploy:sandbox${NC}     - Deploy to sandbox"
echo -e "   ${BLUE}→${NC} ${YELLOW}npm run deploy:production${NC}  - Deploy to production"
echo ""
echo -e "${BLUE}📚 For detailed documentation, see:${NC}"
echo -e "   ${YELLOW}stripe_collection_module/README.md${NC}"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"
echo ""

