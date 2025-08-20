# Updated Progress API Endpoints

## Enhanced Progress Endpoints with Lessons & Modules

### 1. Get User Course Progress (Enhanced)
```http
GET /api/v1/courses/progress/:courseId
Authorization: Bearer <jwt_token>
```

**Response** (Now includes lessons and modules):
```json
{
  "success": true,
  "data": {
    "course": {
      "_id": "courseId",
      "title": "Course Title",
      "description": "Course Description"
    },
    "overallProgress": 45,
    "currentModuleIndex": 1,
    "isCompleted": false,
    "completedAt": null,
    "totalWatchTime": 3600,
    "lastActivityAt": "2025-08-20T19:30:00.000Z",
    "modules": [
      {
        "moduleId": "moduleId1",
        "title": "Module 1: Introduction",
        "description": "Basic concepts",
        "order": 1,
        "isCompleted": true,
        "completedAt": "2025-08-20T18:00:00.000Z",
        "unlockedAt": "2025-08-20T10:00:00.000Z",
        "canAccess": true,
        "lessons": [
          {
            "lessonId": "lessonId1",
            "title": "Lesson 1.1: Getting Started",
            "description": "Introduction to the topic",
            "duration": 1200,
            "watchTime": 1200,
            "totalDuration": 1200,
            "isCompleted": true,
            "completedAt": "2025-08-20T18:00:00.000Z",
            "progressPercentage": 100
          },
          {
            "lessonId": "lessonId2",
            "title": "Lesson 1.2: Basic Concepts",
            "description": "Core fundamentals",
            "duration": 900,
            "watchTime": 720,
            "totalDuration": 900,
            "isCompleted": false,
            "completedAt": null,
            "progressPercentage": 80
          }
        ],
        "assessmentAttempts": [
          {
            "assessmentId": "assessmentId1",
            "score": 85,
            "passed": true,
            "attemptedAt": "2025-08-20T18:30:00.000Z"
          }
        ]
      },
      {
        "moduleId": "moduleId2",
        "title": "Module 2: Advanced Topics",
        "description": "Advanced concepts",
        "order": 2,
        "isCompleted": false,
        "completedAt": null,
        "unlockedAt": "2025-08-20T18:30:00.000Z",
        "canAccess": true,
        "lessons": [
          {
            "lessonId": "lessonId3",
            "title": "Lesson 2.1: Advanced Concepts",
            "description": "Deep dive into advanced topics",
            "duration": 1800,
            "watchTime": 600,
            "totalDuration": 1800,
            "isCompleted": false,
            "completedAt": null,
            "progressPercentage": 33
          }
        ],
        "assessmentAttempts": []
      }
    ]
  }
}
```

### 2. Alternative Progress Endpoint (Also Available)
```http
GET /api/v1/progress/courses/:courseId/progress
Authorization: Bearer <jwt_token>
```

**Same Response Format** as above.

## Key Features

✅ **Complete Progress Data**: Returns overall course progress with detailed module/lesson breakdown
✅ **Video Progress Tracking**: Shows watch time vs total duration for each lesson
✅ **Sequential Access Control**: `canAccess` field shows if user can access each module
✅ **Assessment History**: Includes all assessment attempts with scores
✅ **Real-time Updates**: Progress updates as users watch videos and complete assessments
✅ **Course Information**: Includes basic course details in response

## Usage Examples

### Frontend Implementation
```javascript
// Get user's progress for a specific course
const getProgress = async (courseId) => {
  const response = await fetch(`/api/v1/courses/progress/${courseId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data; // Returns the enhanced progress object
};

// Check if user can access a specific module
const canAccessModule = (progressData, moduleIndex) => {
  return progressData.modules[moduleIndex]?.canAccess;
};

// Get lesson completion percentage
const getLessonProgress = (lesson) => {
  return lesson.progressPercentage; // 0-100%
};
```

## Migration Notes

- **Breaking Change**: The response format has changed from the old UserCourseProgress model
- **Enhanced Data**: Now includes full lesson details, video progress, and module access control
- **Backward Compatibility**: Old endpoint URL remains the same, only response format enhanced
- **Performance**: Uses lean queries and efficient population for better performance

## Related Endpoints

- `POST /api/v1/progress/courses/:courseId/modules/:moduleId/lessons/:lessonId/progress` - Update video progress
- `GET /api/v1/progress/courses/:courseId/modules/:moduleId/access` - Check module access
- `POST /api/v1/progress/courses/:courseId/modules/:moduleId/assessments/:assessmentId/submit` - Submit assessment
