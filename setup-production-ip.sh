#!/bin/bash
# Production IP Setup Helper for Paystack

echo "🚀 TechyJaunt Production IP Setup Helper"
echo "========================================"

# Get the production domain from user
echo "Enter your production domain (e.g., api.techyjaunt.com):"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty"
    exit 1
fi

echo ""
echo "📍 Getting IP information for: $DOMAIN"
echo "-----------------------------------"

# Check if the domain is reachable
if curl -s --fail "https://$DOMAIN/health" > /dev/null 2>&1; then
    echo "✅ Production server is reachable"
    
    # Get server info
    echo "📊 Server Information:"
    curl -s "https://$DOMAIN/server-info" | jq '.' 2>/dev/null || curl -s "https://$DOMAIN/server-info"
    echo ""
    
    # Get just the IP
    echo "📍 Public IP for Paystack Whitelisting:"
    curl -s "https://$DOMAIN/server-info" | jq -r '.server.publicIP' 2>/dev/null || echo "Check the full server info above"
    echo ""
    
    echo "🔧 Paystack Configuration:"
    echo "1. Webhook URL: https://$DOMAIN/api/v1/payments/webhook"
    echo "2. IP to whitelist: (see above)"
    echo "3. Go to Paystack Dashboard → Settings → Webhooks"
    echo "4. Add the webhook URL and whitelist the IP"
    
elif curl -s --fail "http://$DOMAIN/health" > /dev/null 2>&1; then
    echo "✅ Production server is reachable (HTTP)"
    
    # Get server info
    echo "📊 Server Information:"
    curl -s "http://$DOMAIN/server-info" | jq '.' 2>/dev/null || curl -s "http://$DOMAIN/server-info"
    echo ""
    
    echo "⚠️  Warning: Server is using HTTP, consider using HTTPS for production"
    
else
    echo "❌ Cannot reach production server at $DOMAIN"
    echo "Please check:"
    echo "1. Domain is correct"
    echo "2. Server is running"
    echo "3. Firewall/security groups allow HTTP/HTTPS traffic"
fi
