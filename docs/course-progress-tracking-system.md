# Course Progress Tracking System - Frontend Developer Guide

This document explains how the course progress tracking works in the TechyJaunt Learning Platform based on the actual MongoDB implementation.

## Overview

The system tracks user progress through courses using a MongoDB-based structure with real-time updates. Progress is tied to active subscriptions and follows a sequential module unlocking pattern.

## Database Schema (MongoDB)

### Progress Document Structure
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Reference to User
  courseId: ObjectId,         // Reference to Course  
  subscriptionId: ObjectId,   // Reference to active Subscription
  currentModuleIndex: Number, // Index of currently accessible module (0-based)
  overallProgress: Number,    // 0-100 percentage
  totalWatchTime: Number,     // Total seconds watched across all videos
  isCompleted: Boolean,       // Course completion status
  completedAt: Date,          // When course was completed
  lastActivityAt: Date,       // Last interaction timestamp
  modules: [ModuleProgress],  // Array of module progress objects
  createdAt: Date,
  updatedAt: Date
}
```

### Module Progress Structure
```javascript
{
  moduleId: ObjectId,         // Reference to Module
  lessons: [LessonProgress],  // Array of lesson progress
  assessmentAttempts: [AssessmentAttempt], // Assessment history
  isCompleted: Boolean,       // Module completion status
  completedAt: Date,          // When module was completed  
  unlockedAt: Date           // When module was unlocked
}
```

### Lesson Progress Structure
```javascript
{
  lessonId: ObjectId,         // Reference to PrerecordedClass (video)
  watchTime: Number,          // Seconds watched
  totalDuration: Number,      // Total video duration in seconds
  isCompleted: Boolean,       // Lesson completion status (>= 80% watched)
  completedAt: Date,          // When lesson was completed
  lastWatchedAt: Date        // Last time user watched this lesson
}
```

## Available API Endpoints

### Progress Tracking Endpoints

#### 1. Initialize Progress (Called after successful subscription)
```http
POST /api/v1/progress/courses/:courseId/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscriptionId": "subscription_id_here"
}
```

**Response:**
```javascript
{
  "status": "success", 
  "message": "Progress initialized successfully",
  "data": {
    // Full progress object with all modules initialized
    "currentModuleIndex": 0,
    "overallProgress": 0,
    "modules": [...]
  }
}
```

#### 2. Update Video Progress (Real-time during video watching)
```http
PUT /api/v1/progress/courses/:courseId/lessons/:lessonId/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "watchTime": 450,      // Seconds watched so far
  "totalDuration": 1800  // Total video duration in seconds
}
```

**Response:**
```javascript
{
  "status": "success",
  "message": "Video progress updated successfully", 
  "data": {
    "progress": {
      "lessonCompleted": true,        // If lesson just got completed
      "moduleCompleted": false,       // If module just got completed
      "nextModuleUnlocked": false,    // If next module was unlocked
      "overallProgress": 25,          // Updated overall percentage
      "currentModule": {
        "moduleId": "...",
        "progress": 75,               // Module progress percentage
        "unlockedAt": "2024-01-01T..."
      }
    }
  }
}
```

#### 3. Get User Progress for Course
```http
GET /api/v1/progress/courses/:courseId/progress
Authorization: Bearer <token>
```

**Response:**
```javascript
{
  "status": "success",
  "data": {
    "userId": "...",
    "courseId": "...",
    "currentModuleIndex": 2,
    "overallProgress": 65,
    "totalWatchTime": 7200,  // Total seconds watched
    "isCompleted": false,
    "modules": [
      {
        "moduleId": "...",
        "isCompleted": true,
        "unlockedAt": "2024-01-01T...",
        "lessons": [
          {
            "lessonId": "...",
            "watchTime": 1800,
            "totalDuration": 1800,
            "isCompleted": true,
            "completedAt": "2024-01-01T..."
          }
        ]
      }
    ]
  }
}
```

#### 4. Check Module Access
```http
GET /api/v1/progress/courses/:courseId/modules/:moduleId/access
Authorization: Bearer <token>
```

**Response:**
```javascript
{
  "status": "success",
  "data": {
    "hasAccess": true,
    "reason": "module_unlocked", // or "subscription_required", "previous_module_incomplete"
    "moduleIndex": 2,
    "requiresPreviousCompletion": true
  }
}
```

#### 5. Get User Dashboard
```http
GET /api/v1/progress/dashboard
Authorization: Bearer <token>
```

**Response:**
```javascript
{
  "status": "success",
  "data": {
    "courses": [
      {
        "courseId": "...",
        "courseTitle": "...",
        "overallProgress": 45,
        "currentModule": {
          "moduleId": "...", 
          "title": "...",
          "progress": 75
        },
        "lastActivityAt": "2024-01-01T..."
      }
    ],
    "totalCoursesEnrolled": 3,
    "completedCourses": 1,
    "totalWatchTime": 15000  // Across all courses
  }
}
```

### Assessment Endpoints

#### 6. Get Assessment by Module
```http
GET /api/v1/assessments/modules/:moduleId/assessment
Authorization: Bearer <token>
```

#### 7. Submit Assessment
```http
POST /api/v1/assessments/:assessmentId/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "question_id",
      "selectedOptionId": "option_id"  // Can be null for timeout submissions
    }
  ]
}
```

### Course Management Endpoints

#### 8. Get All Courses (includes modules and lessons with video URLs)
```http
GET /api/v1/courses
Authorization: Bearer <token>
```

#### 9. Get Course by ID
```http
GET /api/v1/courses/:courseId
Authorization: Bearer <token>
```

#### 10. Update Lesson
```http
PUT /api/v1/courses/lessons/:lessonId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Lesson Title",
  "content": {
    "videoUrl": "https://cloudinary.com/video.mp4"
    // videoDuration will be auto-fetched from Cloudinary
  }
}
```

#### 11. Delete Lesson
```http
DELETE /api/v1/courses/lessons/:lessonId
Authorization: Bearer <token>
```

## Sequential Progress Flow

### Step 1: User Subscribes to Course
1. User completes payment for subscription
2. System creates/activates subscription record
3. **Frontend calls**: `POST /api/v1/progress/courses/:courseId/initialize`
4. System creates progress record with all modules and lessons initialized
5. Only first module (index 0) is unlocked initially

### Step 2: User Starts Watching Videos
1. **Frontend calls**: `PUT /api/v1/progress/courses/:courseId/lessons/:lessonId/progress` 
2. Send watchTime and totalDuration every 10-30 seconds while video plays
3. System updates lesson progress in real-time
4. When watchTime >= 80% of totalDuration, lesson marked as completed

### Step 3: Lesson Completion Logic
```javascript
// Lesson is considered completed when:
if (watchTime / totalDuration >= 0.8) {
  lesson.isCompleted = true;
  lesson.completedAt = new Date();
}
```

### Step 4: Module Completion Check
After each lesson completion, system checks:
1. **All lessons completed?** - Count completed lessons vs total lessons
2. **Assessment passed?** - If module has assessment, user must pass it
3. **Both conditions met?** - Module marked as completed

### Step 5: Module Unlocking
When a module is completed:
1. `currentModuleIndex` is incremented
2. Next module's `unlockedAt` timestamp is set
3. User gains access to next module's content

### Step 6: Assessment Flow (if module has assessment)
1. Complete all lessons in module first
2. **Frontend calls**: `GET /api/v1/assessments/modules/:moduleId/assessment`
3. User takes assessment
4. **Frontend calls**: `POST /api/v1/assessments/:assessmentId/submit`
5. If passed (score >= passingScore), module is completed
6. If failed, user can retry (up to attempt limit)

### Step 7: Course Completion
When all modules are completed:
1. `isCompleted` set to true
2. `completedAt` timestamp set
3. Certificate generation triggered
4. User gains access to alumni features

## Frontend Implementation Guidelines

### Real-time Progress Updates
```javascript
// Update progress every 30 seconds during video playback
setInterval(() => {
  if (videoPlayer.getCurrentTime() > lastSavedTime + 30) {
    updateVideoProgress(
      courseId,
      lessonId, 
      videoPlayer.getCurrentTime(),
      videoPlayer.getDuration()
    );
    lastSavedTime = videoPlayer.getCurrentTime();
  }
}, 30000);
```

### Module Access Control
```javascript
// Before allowing access to a module
const checkModuleAccess = async (courseId, moduleId) => {
  const response = await fetch(`/api/v1/progress/courses/${courseId}/modules/${moduleId}/access`);
  const { data } = await response.json();
  
  if (!data.hasAccess) {
    // Show appropriate message based on data.reason
    switch(data.reason) {
      case 'subscription_required':
        showSubscriptionPrompt();
        break;
      case 'previous_module_incomplete':
        showPreviousModuleMessage();
        break;
    }
    return false;
  }
  return true;
};
```

### Progress Calculation Display
```javascript
// Display progress percentages
const calculateLessonProgress = (watchTime, totalDuration) => {
  return Math.min(100, Math.round((watchTime / totalDuration) * 100));
};

const isLessonCompleted = (watchTime, totalDuration) => {
  return (watchTime / totalDuration) >= 0.8;
};
```

### Assessment Timeout Handling
```javascript
// Handle assessment timeout - submit partial answers
const submitAssessment = async (assessmentId, answers) => {
  // answers array can contain null values for unanswered questions
  const response = await fetch(`/api/v1/assessments/${assessmentId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  
  const result = await response.json();
  // result.data will include timeoutSubmission: true if partial
};
```

## Key Business Rules

1. **Sequential Access**: Users cannot skip modules - must complete in order
2. **80% Completion Rule**: Videos must be watched to 80% to count as completed  
3. **Assessment Requirement**: If module has assessment, must pass to complete module
4. **Subscription Validation**: All access checks verify active subscription
5. **Auto Video Duration**: Video durations are auto-fetched from Cloudinary URLs
6. **Graceful Timeout**: Assessments accept partial submissions when time runs out
7. **Real-time Sync**: Progress updates immediately reflect in database and UI

This system ensures structured learning while providing flexibility for different learning styles and paces.
