/**
 * Migration Script: Group Existing AI Tutor History into Chat Sessions
 * 
 * This script creates chat sessions for existing AI tutor interactions
 * by grouping them based on userId, courseId, and date proximity
 */

import mongoose from 'mongoose';
import AITutorHistory from '../src/resources/ai-tutor/models/aiTutorHistory.js';
import AITutorChat from '../src/resources/ai-tutor/models/aiTutorChat.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

// Configuration
const TIME_GAP_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error('Failed to connect to MongoDB');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Group interactions into chat sessions based on:
 * - Same user
 * - Same course (if applicable)
 * - Time proximity (within TIME_GAP_THRESHOLD)
 */
function groupInteractionsIntoSessions(interactions) {
  if (interactions.length === 0) return [];

  const sessions = [];
  let currentSession = [interactions[0]];

  for (let i = 1; i < interactions.length; i++) {
    const current = interactions[i];
    const previous = interactions[i - 1];
    
    const timeDiff = current.createdAt - previous.createdAt;
    const sameCourse = String(current.courseId) === String(previous.courseId);
    
    // If within time threshold and same course (or both have no course), add to current session
    if (timeDiff <= TIME_GAP_THRESHOLD && sameCourse) {
      currentSession.push(current);
    } else {
      // Start a new session
      sessions.push(currentSession);
      currentSession = [current];
    }
  }
  
  // Don't forget the last session
  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  return sessions;
}

/**
 * Generate a chat title from the first interaction
 */
function generateChatTitle(firstInteraction) {
  const input = firstInteraction.userInput || firstInteraction.topic || 'AI Chat';
  const words = input.split(' ').slice(0, 6);
  return words.join(' ') + (input.split(' ').length > 6 ? '...' : '');
}

/**
 * Get all users who have AI tutor interactions
 */
async function getUsersWithInteractions() {
  try {
    const users = await AITutorHistory.distinct('userId', { chatId: { $exists: false } });
    log.info(`Found ${users.length} users with AI tutor interactions without chat assignments`);
    return users;
  } catch (error) {
    log.error('Failed to get users with interactions');
    throw error;
  }
}

/**
 * Migrate interactions for a single user
 */
async function migrateUserInteractions(userId) {
  try {
    // Get all interactions for this user that don't have a chatId
    const interactions = await AITutorHistory.find({
      userId,
      chatId: { $exists: false }
    }).sort({ createdAt: 1 }).lean();

    if (interactions.length === 0) {
      return { userId, chatsCreated: 0, messagesMigrated: 0 };
    }

    log.info(`Processing ${interactions.length} interactions for user ${userId}`);

    // Group interactions into sessions
    const sessions = groupInteractionsIntoSessions(interactions);
    log.info(`Grouped into ${sessions.length} chat sessions`);

    let chatsCreated = 0;
    let messagesMigrated = 0;

    // Create a chat for each session and link the interactions
    for (const session of sessions) {
      const firstInteraction = session[0];
      const lastInteraction = session[session.length - 1];

      // Create the chat
      const chat = new AITutorChat({
        userId,
        title: generateChatTitle(firstInteraction),
        courseId: firstInteraction.courseId,
        description: `Migrated chat from ${firstInteraction.createdAt.toLocaleDateString()}`,
        metadata: {
          messageCount: session.length,
          lastMessageAt: lastInteraction.createdAt,
          tags: ['migrated', 'legacy']
        },
        createdAt: firstInteraction.createdAt,
        updatedAt: lastInteraction.createdAt
      });

      await chat.save();
      chatsCreated++;

      // Update all interactions in this session to link to the chat
      const interactionIds = session.map(i => i._id);
      await AITutorHistory.updateMany(
        { _id: { $in: interactionIds } },
        { $set: { chatId: chat._id } }
      );

      messagesMigrated += session.length;
    }

    return { userId, chatsCreated, messagesMigrated };

  } catch (error) {
    log.error(`Failed to migrate interactions for user ${userId}`);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  log.section('AI TUTOR CHAT MIGRATION');
  log.info('This script will group existing AI tutor interactions into chat sessions');
  log.warning(`Time gap threshold: ${TIME_GAP_THRESHOLD / 1000 / 60} minutes`);

  await connectDB();

  try {
    // Check how many interactions need migration
    const unmigrated = await AITutorHistory.countDocuments({ chatId: { $exists: false } });
    log.info(`Found ${unmigrated} interactions without chat assignments`);

    if (unmigrated === 0) {
      log.success('No interactions to migrate!');
      await mongoose.disconnect();
      return;
    }

    // Get all users with interactions
    const users = await getUsersWithInteractions();

    log.section('Starting Migration');

    let totalChatsCreated = 0;
    let totalMessagesMigrated = 0;

    // Migrate interactions for each user
    for (let i = 0; i < users.length; i++) {
      const userId = users[i];
      log.info(`\nMigrating user ${i + 1}/${users.length}: ${userId}`);

      const result = await migrateUserInteractions(userId);
      totalChatsCreated += result.chatsCreated;
      totalMessagesMigrated += result.messagesMigrated;

      log.success(`Created ${result.chatsCreated} chats, migrated ${result.messagesMigrated} messages`);
    }

    log.section('Migration Complete');
    log.success(`Total chats created: ${totalChatsCreated}`);
    log.success(`Total messages migrated: ${totalMessagesMigrated}`);
    log.info('All existing interactions have been grouped into chat sessions');

  } catch (error) {
    log.error('Migration failed');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

/**
 * Rollback function - removes all migrated chats and chatId references
 */
async function rollbackMigration() {
  log.section('AI TUTOR CHAT MIGRATION ROLLBACK');
  log.warning('This will remove all chats with "migrated" tag and unlink messages');

  await connectDB();

  try {
    // Find all migrated chats
    const migratedChats = await AITutorChat.find({ 'metadata.tags': 'migrated' });
    log.info(`Found ${migratedChats.length} migrated chats`);

    if (migratedChats.length === 0) {
      log.info('No migrated chats to rollback');
      await mongoose.disconnect();
      return;
    }

    const chatIds = migratedChats.map(c => c._id);

    // Remove chatId from all interactions that link to these chats
    const updateResult = await AITutorHistory.updateMany(
      { chatId: { $in: chatIds } },
      { $unset: { chatId: 1 } }
    );
    log.success(`Unlinked ${updateResult.modifiedCount} messages from migrated chats`);

    // Delete all migrated chats
    const deleteResult = await AITutorChat.deleteMany({ _id: { $in: chatIds } });
    log.success(`Deleted ${deleteResult.deletedCount} migrated chats`);

    log.section('Rollback Complete');

  } catch (error) {
    log.error('Rollback failed');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  rollbackMigration();
} else if (command === 'migrate' || !command) {
  runMigration();
} else {
  console.log(`
Usage:
  node migrate-ai-tutor-chats.js [command]

Commands:
  migrate   - Run the migration (default)
  rollback  - Undo the migration

Examples:
  node migrate-ai-tutor-chats.js
  node migrate-ai-tutor-chats.js migrate
  node migrate-ai-tutor-chats.js rollback
  `);
  process.exit(0);
}
