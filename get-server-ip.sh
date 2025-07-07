#!/bin/bash
# Script to get server IP for Paystack whitelisting

echo "🌐 Getting Server IP for Paystack Whitelisting..."
echo "==============================================="

# Check if server is running
if curl -s --fail http://localhost:4000/health > /dev/null; then
    echo "✅ Server is running on localhost:4000"
    echo ""
    
    # Get simple IP
    echo "📍 Simple IP Check:"
    curl -s http://localhost:4000/ip | jq '.' 2>/dev/null || curl -s http://localhost:4000/ip
    echo ""
    
    # Get detailed server info
    echo "📊 Detailed Server Info:"
    curl -s http://localhost:4000/server-info | jq '.' 2>/dev/null || curl -s http://localhost:4000/server-info
    echo ""
    
    echo "🔧 Next Steps:"
    echo "1. Copy the 'publicIP' or 'clientIP' value"
    echo "2. Go to Paystack Dashboard → Settings → Webhooks"
    echo "3. Add webhook URL: https://your-domain.com/api/v1/payments/webhook"
    echo "4. Whitelist the IP address you copied"
    echo ""
else
    echo "❌ Server is not running on localhost:4000"
    echo "Please start the server first: npm run dev"
fi
