/**
 * Create (or promote) a super admin account.
 *
 * Usage:
 *   node scripts/create-super-admin.js <email> [--first=Name] [--last=Name] [--promote]
 *
 * Connects to MONGO_URI from .env. A random password is generated and printed
 * once; it is never stored in plain text. If the email already exists the script
 * stops, unless --promote is passed (then only the role changes).
 */
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../src/database/db.js";
import User from "../src/resources/user/models/user.js";
import { generateTemporaryPassword } from "../src/utils/helper/tempPassword.js";

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const promote = args.includes("--promote");

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/create-super-admin.js <email> [--first=Name] [--last=Name] [--promote]");
  process.exit(1);
}

const run = async () => {
  await connectDB(process.env.MONGO_URI);
  const dbName = mongoose.connection.name;

  const existing = await User.findOne({ email });
  if (existing) {
    if (!promote) {
      console.error(`${email} already exists (role: ${existing.role}). Re-run with --promote to make it a super admin.`);
      return 1;
    }
    existing.role = "super admin";
    existing.status = "active";
    await existing.save();
    console.log(`Promoted ${email} to super admin in database "${dbName}". Password unchanged.`);
    return 0;
  }

  const password = generateTemporaryPassword();
  await User.create({
    email,
    firstName: flag("first") || "Super",
    lastName: flag("last") || "Admin",
    password: await bcrypt.hash(password, 12),
    role: "super admin",
    status: "active",
    emailVerified: true,
    profileCompleted: true,
  });

  console.log(`Created super admin in database "${dbName}"`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("Store this password now; it is not shown again. Change it after first login.");
  return 0;
};

run()
  .then((code) => mongoose.disconnect().then(() => process.exit(code)))
  .catch(async (error) => {
    console.error(`Failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
