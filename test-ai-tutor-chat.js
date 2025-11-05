// Test file for AI Tutor Chat Feature
// Run this file to test the new chat functionality

import axios from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_JWT_TOKEN_HERE';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

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
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}\n`)
};

// Test functions
async function testCreateChat() {
  log.section('TEST 1: Create New Chat');
  
  try {
    const response = await api.post('/api/v1/ai-tutor/chats', {
      title: 'Test Chat - Learning Node.js',
      description: 'Questions about Node.js basics and async programming'
    });
    
    log.success('Chat created successfully');
    console.log('Chat ID:', response.data.data._id);
    console.log('Chat Title:', response.data.data.title);
    
    return response.data.data._id;
  } catch (error) {
    log.error('Failed to create chat');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function testAskQuestionInChat(chatId) {
  log.section('TEST 2: Ask Question in Chat');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.post('/api/v1/ai-tutor/question', {
      question: 'What is the event loop in Node.js?',
      chatId: chatId,
      userLevel: 'intermediate'
    });
    
    log.success('Question answered successfully');
    console.log('Question:', response.data.data.question);
    console.log('Answer preview:', response.data.data.answer.substring(0, 100) + '...');
    console.log('Interaction ID:', response.data.data.interactionId);
  } catch (error) {
    log.error('Failed to ask question');
    console.error(error.response?.data || error.message);
  }
}

async function testAskAnotherQuestionInChat(chatId) {
  log.section('TEST 3: Ask Another Question in Same Chat');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.post('/api/v1/ai-tutor/question', {
      question: 'How does async/await work in JavaScript?',
      chatId: chatId,
      userLevel: 'intermediate'
    });
    
    log.success('Second question answered successfully');
    console.log('Question:', response.data.data.question);
    console.log('Answer preview:', response.data.data.answer.substring(0, 100) + '...');
  } catch (error) {
    log.error('Failed to ask question');
    console.error(error.response?.data || error.message);
  }
}

async function testGetChatWithMessages(chatId) {
  log.section('TEST 4: Get Chat with Messages');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.get(`/api/v1/ai-tutor/chats/${chatId}`);
    
    log.success('Chat retrieved successfully');
    console.log('Chat Title:', response.data.data.chat.title);
    console.log('Message Count:', response.data.data.chat.metadata.messageCount);
    console.log('Total Messages Retrieved:', response.data.data.messages.length);
    
    console.log('\nMessages:');
    response.data.data.messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Q: ${msg.userInput.substring(0, 50)}...`);
      console.log(`   A: ${msg.aiResponse.substring(0, 80)}...`);
    });
  } catch (error) {
    log.error('Failed to get chat');
    console.error(error.response?.data || error.message);
  }
}

async function testGetAllChats() {
  log.section('TEST 5: Get All User Chats');
  
  try {
    const response = await api.get('/api/v1/ai-tutor/chats?limit=10&page=1');
    
    log.success('Chats retrieved successfully');
    console.log('Total Chats:', response.data.pagination.totalItems);
    console.log('Current Page:', response.data.pagination.currentPage);
    
    console.log('\nUser Chats:');
    response.data.chats.forEach((chat, index) => {
      console.log(`\n${index + 1}. ${chat.title}`);
      console.log(`   Messages: ${chat.metadata.messageCount}`);
      console.log(`   Pinned: ${chat.isPinned}`);
      console.log(`   Last Activity: ${chat.metadata.lastMessageAt || 'N/A'}`);
    });
  } catch (error) {
    log.error('Failed to get chats');
    console.error(error.response?.data || error.message);
  }
}

async function testUpdateChat(chatId) {
  log.section('TEST 6: Update Chat (Pin it)');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.patch(`/api/v1/ai-tutor/chats/${chatId}`, {
      isPinned: true,
      title: 'Updated: Learning Node.js (Important)'
    });
    
    log.success('Chat updated successfully');
    console.log('New Title:', response.data.data.title);
    console.log('Pinned:', response.data.data.isPinned);
  } catch (error) {
    log.error('Failed to update chat');
    console.error(error.response?.data || error.message);
  }
}

async function testGetChatStatistics() {
  log.section('TEST 7: Get Chat Statistics');
  
  try {
    const response = await api.get('/api/v1/ai-tutor/chats/statistics');
    
    log.success('Statistics retrieved successfully');
    console.log('Total Chats:', response.data.data.totalChats);
    console.log('Archived Chats:', response.data.data.archivedChats);
    console.log('Pinned Chats:', response.data.data.pinnedChats);
    
    console.log('\nMost Active Chats:');
    response.data.data.mostActiveChats.forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.title} - ${chat.metadata.messageCount} messages`);
    });
  } catch (error) {
    log.error('Failed to get statistics');
    console.error(error.response?.data || error.message);
  }
}

async function testCreateChatWithAutoTitle() {
  log.section('TEST 8: Create Chat with Auto-Generated Title');
  
  try {
    // Create chat without title (or with default "New Chat")
    const chatResponse = await api.post('/api/v1/ai-tutor/chats', {});
    const chatId = chatResponse.data.data._id;
    
    log.success('Chat created (no custom title)');
    console.log('Initial Title:', chatResponse.data.data.title);
    
    // Ask first question (this should auto-generate the title)
    await api.post('/api/v1/ai-tutor/question', {
      question: 'What are React components and how do they work?',
      chatId: chatId,
      userLevel: 'beginner'
    });
    
    log.success('Question asked - title should be auto-generated');
    
    // Get the chat again to see the updated title
    const updatedChat = await api.get(`/api/v1/ai-tutor/chats/${chatId}`);
    console.log('Auto-Generated Title:', updatedChat.data.data.chat.title);
    
    return chatId;
  } catch (error) {
    log.error('Failed auto-title test');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function testArchiveChat(chatId) {
  log.section('TEST 9: Archive Chat');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.patch(`/api/v1/ai-tutor/chats/${chatId}`, {
      isArchived: true
    });
    
    log.success('Chat archived successfully');
    console.log('Chat ID:', response.data.data._id);
    console.log('Archived:', response.data.data.isArchived);
  } catch (error) {
    log.error('Failed to archive chat');
    console.error(error.response?.data || error.message);
  }
}

async function testDeleteChat(chatId) {
  log.section('TEST 10: Delete Chat');
  
  if (!chatId) {
    log.error('No chatId provided. Skipping test.');
    return;
  }
  
  try {
    const response = await api.delete(`/api/v1/ai-tutor/chats/${chatId}`);
    
    log.success('Chat deleted successfully');
    console.log('Success:', response.data.data.success);
  } catch (error) {
    log.error('Failed to delete chat');
    console.error(error.response?.data || error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log(`${colors.yellow}
╔════════════════════════════════════════════════╗
║   AI TUTOR CHAT FEATURE - TEST SUITE          ║
╚════════════════════════════════════════════════╝
${colors.reset}`);

  log.info('Starting tests...');
  log.info(`Base URL: ${BASE_URL}`);
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    log.error('Please set your AUTH_TOKEN in the script or as environment variable');
    log.info('Usage: AUTH_TOKEN=your_token_here BASE_URL=http://localhost:3000 node test-ai-tutor-chat.js');
    process.exit(1);
  }

  try {
    // Create first chat and test it
    const chatId1 = await testCreateChat();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await testAskQuestionInChat(chatId1);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await testAskAnotherQuestionInChat(chatId1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetChatWithMessages(chatId1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testUpdateChat(chatId1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create second chat with auto-title
    const chatId2 = await testCreateChatWithAutoTitle();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get all chats and statistics
    await testGetAllChats();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetChatStatistics();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Archive the second chat
    if (chatId2) {
      await testArchiveChat(chatId2);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Delete the second chat (cleanup)
    if (chatId2) {
      await testDeleteChat(chatId2);
    }
    
    log.section('ALL TESTS COMPLETED');
    log.success('Test suite finished successfully!');
    log.info(`First chat (${chatId1}) was left in the database for inspection`);
    
  } catch (error) {
    log.error('Test suite failed');
    console.error(error);
  }
}

// Run tests
runAllTests();
