#!/bin/bash

# Script to seed subscription plans into the database

echo "🌱 Seeding subscription plans..."

# Run the seeder
node seeders/subscription-plans-seeder.js

echo "✅ Subscription plans seeding completed!"
