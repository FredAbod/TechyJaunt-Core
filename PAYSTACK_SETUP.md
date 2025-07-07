🚨 PAYSTACK IP WHITELISTING REQUIRED 🚨
=========================================

Your Paystack API calls are failing because your IP address is not whitelisted.

📍 YOUR PUBLIC IP: 135.129.124.49

🔧 TO FIX THIS ISSUE:

1. 🌐 Log into your Paystack Dashboard
   - Go to https://dashboard.paystack.com
   - Login with your Paystack account

2. ⚙️ Navigate to Settings
   - Click on "Settings" in the left sidebar
   - Go to "Preferences" or "API Keys & Webhooks"

3. 🛡️ Whitelist Your IP
   - Look for "IP Whitelisting" or "Allowed IPs" section
   - Add this IP address: 135.129.124.49
   - Save the changes

4. 🔗 Configure Webhook (Optional but recommended)
   - Webhook URL: http://localhost:4000/api/v1/payments/webhook
   - (For production, use: https://your-domain.com/api/v1/payments/webhook)

5. ✅ Test After Whitelisting
   - Run: node test-paystack-key.js
   - Or test payment initialization in your app

📝 IMPORTANT NOTES:
- If you're using a VPN, disable it or whitelist the VPN's IP
- If your ISP changes your IP frequently, you may need to whitelist multiple IPs
- For production, whitelist your server's public IP (not localhost)

🆘 ALTERNATIVE FOR DEVELOPMENT:
If you can't whitelist IPs, you can:
1. Use Paystack's test mode without IP restrictions (if available)
2. Deploy to a hosting service and whitelist that IP
3. Contact Paystack support for assistance

🧪 QUICK TEST:
After whitelisting, run: node test-paystack-key.js
