# AI Tutor Chat Feature Documentation

## Overview
The AI Tutor Chat feature allows users to organize their AI tutor interactions into separate chat sessions. Each chat maintains its own conversation history, making it easier to manage different topics or learning sessions.

## Key Features

### 1. Multiple Chat Sessions
- Users can create unlimited chat sessions
- Each chat has its own conversation history
- Chats can be organized by topic, course, or learning goal

### 2. Chat Management
- **Create**: Start a new chat session
- **Update**: Modify chat title, description, pin status, or archive status
- **Delete**: Remove a chat and all its messages
- **Pin**: Keep important chats at the top
- **Archive**: Hide completed or old chats from the main view

### 3. Message History
- All questions and answers within a chat are linked together
- Retrieve full conversation history for any specific chat
- Paginated message retrieval for better performance

### 4. Auto-Title Generation
- If no title is provided, the first message automatically generates a chat title
- Titles are derived from the first few words of the initial question

## Database Schema

### AITutorChat Model
```javascript
{
  userId: ObjectId (ref: User),
  title: String (default: "New Chat"),
  courseId: ObjectId (ref: Course, optional),
  description: String (max 500 chars),
  isPinned: Boolean (default: false),
  isArchived: Boolean (default: false),
  metadata: {
    messageCount: Number,
    lastMessageAt: Date,
    tags: [String]
  },
  timestamps: { createdAt, updatedAt }
}
```

### AITutorHistory Model (Updated)
```javascript
{
  userId: ObjectId (ref: User),
  chatId: ObjectId (ref: AITutorChat, optional),  // NEW FIELD
  courseId: ObjectId (ref: Course, optional),
  interactionType: String (enum),
  topic: String,
  userInput: String,
  aiResponse: String,
  userLevel: String,
  metadata: { model, tokensUsed, responseTime, sessionId },
  tags: [String],
  rating: Number,
  feedback: String,
  isArchived: Boolean,
  timestamps: { createdAt, updatedAt }
}
```

## API Endpoints

### 1. Create a New Chat
**POST** `/api/v1/ai-tutor/chats`

**Request Body:**
```json
{
  "title": "Learning React Hooks",
  "description": "Questions about useState and useEffect",
  "courseId": "507f1f77bcf86cd799439011",
  "tags": ["react", "hooks"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "Learning React Hooks",
    "description": "Questions about useState and useEffect",
    "courseId": "507f1f77bcf86cd799439011",
    "isPinned": false,
    "isArchived": false,
    "metadata": {
      "messageCount": 0,
      "tags": ["react", "hooks"]
    },
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

### 2. Get All User's Chats
**GET** `/api/v1/ai-tutor/chats`

**Query Parameters:**
- `limit` (default: 20) - Number of chats per page
- `page` (default: 1) - Page number
- `courseId` - Filter by specific course
- `includeArchived` (true/false) - Include archived chats
- `searchQuery` - Search in title or description

**Response:**
```json
{
  "success": true,
  "message": "Chats retrieved successfully",
  "chats": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "title": "Learning React Hooks",
      "description": "Questions about useState and useEffect",
      "isPinned": true,
      "isArchived": false,
      "metadata": {
        "messageCount": 15,
        "lastMessageAt": "2025-11-04T09:30:00.000Z"
      },
      "courseId": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "React Advanced Course"
      },
      "createdAt": "2025-11-03T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 45,
    "hasNext": true,
    "hasPrev": false,
    "limit": 20
  }
}
```

### 3. Get Specific Chat with Messages
**GET** `/api/v1/ai-tutor/chats/:chatId`

**Query Parameters:**
- `messageLimit` (default: 50) - Number of messages per page
- `messagePage` (default: 1) - Message page number

**Response:**
```json
{
  "success": true,
  "message": "Chat retrieved successfully",
  "data": {
    "chat": {
      "_id": "607f1f77bcf86cd799439011",
      "title": "Learning React Hooks",
      "metadata": {
        "messageCount": 15
      }
    },
    "messages": [
      {
        "_id": "707f1f77bcf86cd799439011",
        "userInput": "What is useState hook?",
        "aiResponse": "useState is a React Hook that...",
        "interactionType": "question",
        "createdAt": "2025-11-03T10:05:00.000Z"
      }
    ],
    "messagePagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 15,
      "hasNext": false,
      "hasPrev": false,
      "limit": 50
    }
  }
}
```

### 4. Ask Question in a Chat
**POST** `/api/v1/ai-tutor/question`

**Request Body:**
```json
{
  "question": "How does useEffect work?",
  "context": "I'm learning React Hooks",
  "userLevel": "intermediate",
  "chatId": "607f1f77bcf86cd799439011",
  "courseId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question answered successfully",
  "data": {
    "question": "How does useEffect work?",
    "answer": "useEffect is a React Hook that allows you to...",
    "userLevel": "intermediate",
    "generatedAt": "2025-11-04T10:15:00.000Z",
    "model": "llama-3.1-8b-instant",
    "interactionId": "707f1f77bcf86cd799439012",
    "chatId": "607f1f77bcf86cd799439011"
  }
}
```

### 5. Update a Chat
**PATCH** `/api/v1/ai-tutor/chats/:chatId`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "New description",
  "isPinned": true,
  "isArchived": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat updated successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439011",
    "title": "Updated Title",
    "isPinned": true,
    "isArchived": false
  }
}
```

### 6. Delete a Chat
**DELETE** `/api/v1/ai-tutor/chats/:chatId`

**Response:**
```json
{
  "success": true,
  "message": "Chat and all its messages deleted successfully",
  "data": {
    "success": true
  }
}
```

### 7. Get Chat Statistics
**GET** `/api/v1/ai-tutor/chats/statistics`

**Response:**
```json
{
  "success": true,
  "message": "Chat statistics retrieved successfully",
  "data": {
    "totalChats": 12,
    "archivedChats": 3,
    "pinnedChats": 2,
    "mostActiveChats": [
      {
        "_id": "607f1f77bcf86cd799439011",
        "title": "Learning React Hooks",
        "metadata": {
          "messageCount": 45
        }
      }
    ],
    "recentChats": [
      {
        "_id": "607f1f77bcf86cd799439011",
        "title": "Learning React Hooks",
        "metadata": {
          "lastMessageAt": "2025-11-04T09:30:00.000Z"
        }
      }
    ]
  }
}
```

## Usage Flow

### For Frontend Developers

#### 1. Starting a New Chat Session
```javascript
// Create a new chat
const response = await fetch('/api/v1/ai-tutor/chats', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Learning Python',
    description: 'Python basics questions'
  })
});

const { data } = await response.json();
const chatId = data._id;
```

#### 2. Asking Questions in a Chat
```javascript
// Ask a question within the chat
const response = await fetch('/api/v1/ai-tutor/question', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'What is a Python list?',
    chatId: chatId,  // Link to the chat
    userLevel: 'beginner'
  })
});
```

#### 3. Retrieving Chat History
```javascript
// Get a specific chat with all messages
const response = await fetch(`/api/v1/ai-tutor/chats/${chatId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
const messages = data.messages; // Array of Q&A
```

#### 4. Listing All Chats
```javascript
// Get all user's chats
const response = await fetch('/api/v1/ai-tutor/chats?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { chats, pagination } = await response.json();
```

## Backward Compatibility

### Legacy Support
- The existing `/api/v1/ai-tutor/question` endpoint still works without `chatId`
- Questions asked without a `chatId` are stored without chat association
- The `/api/v1/ai-tutor/history` endpoint still returns all history, including messages without chats

### Migration Strategy
For existing data:
1. Old questions/answers remain accessible through the history endpoint
2. Users can start using chats going forward
3. Optional: Create a migration script to group old messages into "Legacy Chat" sessions

## Best Practices

### For Frontend Implementation

1. **Always Create a Chat First**
   - Before asking the first question, create a chat session
   - Store the chatId in your component state

2. **Auto-Save Chat Title**
   - Let the backend auto-generate titles from the first message
   - Or prompt users to name their chat after a few exchanges

3. **Display Organization**
   - Show pinned chats at the top
   - Sort by last message time
   - Hide archived chats by default

4. **Handle Chat Deletion**
   - Warn users that deleting a chat removes all messages
   - Provide an "archive" option as a safer alternative

5. **Pagination**
   - Load chats with pagination (default 20 per page)
   - Load messages within a chat with pagination (default 50 per page)

## Rate Limiting

All AI Tutor endpoints have rate limiting:
- **Standard endpoints**: 20 requests per 15 minutes
- **AI generation endpoints**: 10 requests per 10 minutes

## Authentication & Authorization

- All endpoints require authentication via JWT token
- All endpoints require an active subscription with AI Tutor access (Bronze, Silver, or Gold plan)

## Error Handling

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (no AI Tutor access)
- `404` - Not Found (chat doesn't exist or doesn't belong to user)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Example Error Response
```json
{
  "success": false,
  "error": "Chat not found",
  "statusCode": 404
}
```

## Testing the Feature

### Using the Existing Endpoint (Current Frontend Implementation)
```bash
# This still works - questions without chat association
POST /api/v1/ai-tutor/question
{
  "question": "What is JavaScript?",
  "userLevel": "beginner"
}
```

### Using the New Chat Feature
```bash
# 1. Create a chat
POST /api/v1/ai-tutor/chats
{
  "title": "JavaScript Basics"
}

# 2. Ask questions in that chat
POST /api/v1/ai-tutor/question
{
  "question": "What is JavaScript?",
  "chatId": "607f1f77bcf86cd799439011"
}

# 3. Get chat history
GET /api/v1/ai-tutor/chats/607f1f77bcf86cd799439011
```

## Next Steps for Frontend

1. **Update UI to show chat list** instead of flat history
2. **Add "New Chat" button** to create chat sessions
3. **Show messages grouped by chat** in the interface
4. **Add chat management controls** (pin, archive, delete)
5. **Include chatId in question requests** to link to active chat

## Questions?

For any questions or issues with implementing the chat feature, please refer to:
- AI_TUTOR_SETUP.md - Original AI Tutor documentation
- API_DOCUMENTATION.md - General API documentation
