#!/bin/bash

# Vercel Environment Variables Setup Script
# This script reads your local environment files and helps configure them for Vercel deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Azure Calculator - Vercel Environment Variables Setup${NC}"
echo "=================================================================="
echo

# Function to print section headers
print_section() {
    echo -e "${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

# Function to get variable description from comments in env file
get_var_description() {
    local env_file="$1"
    local var_name="$2"
    local description=""
    
    # Look for comment above the variable
    local found_var=false
    local temp_description=""
    
    while IFS= read -r line; do
        # If we find the variable, use the accumulated description
        if [[ $line =~ ^$var_name= ]]; then
            description="$temp_description"
            break
        fi
        
        # If it's a comment line, accumulate it
        if [[ $line =~ ^[[:space:]]*#[[:space:]]*(.*)$ ]]; then
            local comment="${BASH_REMATCH[1]}"
            # Skip empty comments and section headers
            if [[ -n "$comment" && ! "$comment" =~ ^[=\-]+$ ]]; then
                if [[ -n "$temp_description" ]]; then
                    temp_description="$temp_description $comment"
                else
                    temp_description="$comment"
                fi
            fi
        elif [[ ! $line =~ ^[[:space:]]*$ ]]; then
            # Reset description if we hit a non-comment, non-empty line that's not our variable
            temp_description=""
        fi
    done < "$env_file"
    
    echo "$description"
}

# Function to categorize variables
get_var_category() {
    local var_name="$1"
    
    case "$var_name" in
        *AZURE*|*API_VERSION*|*API_BASE_URL*)
            echo "🔧 Azure API Configuration"
            ;;
        *RATE_LIMIT*|*LIMIT*)
            echo "⚡ Rate Limiting Configuration"
            ;;
        *CACHE*|*TTL*)
            echo "💾 Cache Configuration"
            ;;
        *APP_NAME*|*DEFAULT_REGION*)
            echo "🏷️ Application Configuration"
            ;;
        *BATCH*|*DELAY*|*CALCULATION*)
            echo "⚙️ Batch Processing Configuration"
            ;;
        *CORS*)
            echo "🌐 CORS Configuration"
            ;;
        *)
            echo "📝 Other Configuration"
            ;;
    esac
}

# Find environment file
ENV_FILES=(".env.local" ".env" ".env.example")
CURRENT_ENV_FILE=""

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        CURRENT_ENV_FILE="$env_file"
        break
    fi
done

if [ -z "$CURRENT_ENV_FILE" ]; then
    echo -e "${RED}❌ No environment file found (.env.local, .env, .env.example)${NC}"
    echo "Please create a .env.local file with your environment variables."
    exit 1
fi

print_section "📋 CURRENT ENVIRONMENT CONFIGURATION"
echo -e "Reading configuration from: ${GREEN}$CURRENT_ENV_FILE${NC}"
echo

# Read all variables and their values
declare -a env_vars=()
declare -a env_values=()
declare -a env_descriptions=()
declare -a env_categories=()

while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    
    # Extract variable name and value
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"
        
        # Get description and category
        description=$(get_var_description "$CURRENT_ENV_FILE" "$var_name")
        category=$(get_var_category "$var_name")
        
        # Store in arrays
        env_vars+=("$var_name")
        env_values+=("$var_value")
        env_descriptions+=("$description")
        env_categories+=("$category")
        
        echo -e "${GREEN}$var_name${NC} = $var_value"
        if [[ -n "$description" ]]; then
            echo "  💬 $description"
        fi
    fi
done < "$CURRENT_ENV_FILE"

echo
echo -e "${YELLOW}Found ${#env_vars[@]} environment variables that can be configured in Vercel.${NC}"
echo

print_section "📋 ENVIRONMENT VARIABLES BY CATEGORY"

# Display variables grouped by category
current_category=""
for i in "${!env_vars[@]}"; do
    category="${env_categories[$i]}"
    var_name="${env_vars[$i]}"
    var_value="${env_values[$i]}"
    description="${env_descriptions[$i]}"
    
    # Print category header if it's new
    if [[ "$category" != "$current_category" ]]; then
        if [[ -n "$current_category" ]]; then
            echo
        fi
        echo -e "${YELLOW}$category${NC}"
        echo "----------------------------------------"
        current_category="$category"
    fi
    
    echo -e "${GREEN}$var_name${NC}"
    echo "  Value: $var_value"
    if [[ -n "$description" ]]; then
        echo "  Description: $description"
    fi
    
    # Determine if it's required or has defaults
    if [[ "$var_name" == "CORS_ALLOWED_ORIGINS" ]]; then
        echo -e "  ${RED}⚠️  Important for production security${NC}"
    else
        echo "  Required: No (uses default if not set)"
    fi
    echo
done

echo -e "${YELLOW}⚠️  IMPORTANT NOTES:${NC}"
echo "1. All NEXT_PUBLIC_* variables are exposed to the browser"
echo "2. CORS_ALLOWED_ORIGINS is server-side only"
echo "3. For production, set CORS_ALLOWED_ORIGINS to your specific domain(s)"
echo "4. All variables have sensible defaults and are optional (except CORS for security)"
echo

print_section "🔧 VERCEL DEPLOYMENT COMMANDS"
echo "To set environment variables in Vercel, use the Vercel CLI:"
echo

echo -e "${GREEN}# Install Vercel CLI (if not already installed)${NC}"
echo "npm i -g vercel"
echo

echo -e "${GREEN}# Login to Vercel${NC}"
echo "vercel login"
echo

echo -e "${GREEN}# Link your project${NC}"
echo "vercel link"
echo

print_section "🚀 QUICK SETUP COMMANDS"

echo -e "${BLUE}📝 Vercel Environment Types:${NC}"
echo "• production  - Live production deployments"
echo "• preview     - Pull request previews and branch deployments"  
echo "• development - Local development (vercel dev)"
echo

echo -e "${YELLOW}🎯 Recommended: Set for production environment${NC}"
echo "Copy and paste these commands:"
echo

# Generate commands with actual values using stdin
for i in "${!env_vars[@]}"; do
    var_name="${env_vars[$i]}"
    var_value="${env_values[$i]}"
    echo "echo '$var_value' | vercel env add $var_name production"
done

echo
echo -e "${BLUE}🔧 Interactive setup (will prompt for each value):${NC}"

for i in "${!env_vars[@]}"; do
    var_name="${env_vars[$i]}"
    echo "vercel env add $var_name production"
done

echo

print_section "📜 GENERATE SETUP SCRIPT"
echo -e "${YELLOW}Create an executable script to set all variables at once:${NC}"
echo
echo "# Run this command to create the setup script:"
echo "cat > setup-vercel-vars.sh << 'SCRIPT_END'"
echo "#!/bin/bash"
echo "set -e"
echo "echo 'Setting up Vercel environment variables for production...'"
echo

for i in "${!env_vars[@]}"; do
    var_name="${env_vars[$i]}"
    var_value="${env_values[$i]}"
    echo "echo '$var_value' | vercel env add $var_name production"
done

echo
echo "echo 'Environment variables setup complete!'"
echo "SCRIPT_END"
echo
echo "# Then make it executable and run:"
echo "chmod +x setup-vercel-vars.sh"
echo "./setup-vercel-vars.sh"

echo

echo -e "${GREEN}# Alternative: Set via Vercel Dashboard${NC}"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project"
echo "3. Go to Settings > Environment Variables"
echo "4. Add the variables you need"
echo

print_section "📝 PRODUCTION RECOMMENDATIONS"
echo -e "${YELLOW}For production deployment, consider these adjustments:${NC}"
echo

# Generate production recommendations based on current values
for i in "${!env_vars[@]}"; do
    var_name="${env_vars[$i]}"
    var_value="${env_values[$i]}"
    
    case "$var_name" in
        "CORS_ALLOWED_ORIGINS")
            echo "$var_name=https://yourdomain.com  # Replace with your actual domain"
            ;;
        "NEXT_PUBLIC_API_RATE_LIMIT_REQUESTS")
            if [[ "$var_value" -gt 5 ]]; then
                echo "$var_name=5  # More conservative than current: $var_value"
            fi
            ;;
        "NEXT_PUBLIC_CALCULATION_BATCH_SIZE")
            if [[ "$var_value" -gt 1 ]]; then
                echo "$var_name=1  # More conservative than current: $var_value"
            fi
            ;;
    esac
done

echo

print_section "✅ VERIFICATION"
echo "After deployment, you can verify environment variables are working by:"
echo "1. Checking the Vercel deployment logs"
echo "2. Using browser dev tools to inspect NEXT_PUBLIC_* variables"
echo "3. Testing API rate limiting behavior"
echo

echo -e "${GREEN}✨ Setup complete! Your application will use these ${#env_vars[@]} environment variables in Vercel.${NC}" 