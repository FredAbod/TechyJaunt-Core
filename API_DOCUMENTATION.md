# TechyJaunt Learning Management System - API Documentation

## 🚀 **Complete Feature Overview**

### ✅ **Phase 1: Authentication & User Management**
- Email registration with OTP verification
- OTP resend functionality 
- Password setup after verification
- User login with JWT tokens
- Complete profile management
- User dashboard with analytics
- Rate limiting and Joi validation
- Professional email templates

### ✅ **Phase 2: Course Management System** 
- Course creation and management
- Module and lesson structure
- User course enrollment
- Progress tracking with percentages
- Course curriculum management
- Dashboard analytics

### ✅ **Phase 3: Live Classes (Jitsi Meet Integration)**
- Live cl### 7. Get User's Payment Summary
```bash
curl -X GET http://localhost:4000/api/v1/payments/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Get User's Payment Status
```bash
curl -X GET http://localhost:4000/api/v1/payments/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔑 **Subscription API Examples & Testing**

### **Subscription Plans Available**

**Note:** Subscription plans are now stored in the database and can be dynamically managed. Plans are seeded using the migration script.

## 1. **Get Subscription Plans (Public)**
```http
GET /api/v1/subscriptions/plans
```

**Description:** Retrieves all active subscription plans from the database with detailed features, pricing, and metadata.

**Authentication:** None required (Public endpoint)

**Response:**
```json
{
  "status": "success",
  "message": "Subscription plans retrieved successfully",
  "data": {
    "plans": {
      "bronze": {
        "id": "plan_database_id",
        "name": "Bronze Plan",
        "price": 1580000,
        "currency": "NGN",
        "billing": "one-time",
        "description": "One-time payment with lifetime course access",
        "features": [
          { 
            "feature": "Self-paced course with lifetime access", 
            "duration": "lifetime", 
            "included": true,
            "limit": null
          },
          { 
            "feature": "AI Tutor", 
            "duration": "1-month", 
            "included": true,
            "limit": null
          },
          { 
            "feature": "Certificate upon course completion", 
            "duration": "lifetime", 
            "included": true,
            "limit": null
          }
        ],
        "metadata": {
          "popular": false,
          "recommended": false,
          "lifetimeAccess": true
        },
        "formattedPrice": "₦15,800"
      },
      "silver": {
        "id": "plan_database_id",
        "name": "Silver Plan",
        "price": 3000000,
        "currency": "NGN",
        "billing": "monthly",
        "description": "Monthly subscription with mentorship and AI tutor",
        "features": [
          { 
            "feature": "AI Tutor", 
            "duration": "1-month", 
            "included": true,
            "limit": null
          },
          { 
            "feature": "Weekly one-on-one consultation with a mentor", 
            "duration": "1-month", 
            "included": true,
            "limit": 4
          }
        ],
        "metadata": {
          "popular": true,
          "recommended": false,
          "lifetimeAccess": false
        },
        "formattedPrice": "₦30,000"
      },
      "gold": {
        "id": "plan_database_id",
        "name": "Gold Plan",
        "price": 4080000,
        "currency": "NGN",
        "billing": "monthly",
        "description": "Premium monthly subscription with full access",
        "features": [
          { 
            "feature": "Self-paced course with lifetime access", 
            "duration": "lifetime", 
            "included": true,
            "limit": null
          },
          { 
            "feature": "AI Tutor", 
            "duration": "1-month", 
            "included": true,
            "limit": null
          },
          { 
            "feature": "Weekly one-on-one consultation with a mentor", 
            "duration": "1-month", 
            "included": true,
            "limit": 4
          }
        ],
        "metadata": {
          "popular": false,
          "recommended": true,
          "lifetimeAccess": true
        },
        "formattedPrice": "₦40,800"
      }
    }
  }
}
          { "feature": "Certificate upon course completion", "duration": "lifetime", "included": true },
          { "feature": "AI Tutor", "duration": "1-month", "included": true },
          { "feature": "Access to premium learning resources", "duration": "lifetime", "included": true },
          { "feature": "LinkedIn optimization Ebook", "duration": "lifetime", "included": true },
          { "feature": "Networking opportunities", "duration": "lifetime", "included": true },
          { "feature": "Access to our alumni community", "duration": "lifetime", "included": true }
        ]
      },
      "silver": {
        "name": "Silver Plan",
        "price": 3000000,
        "currency": "NGN",
        "billing": "monthly",
        "description": "Monthly subscription with mentorship and AI tutor",
        "features": [
          { "feature": "AI Tutor", "duration": "1-month", "included": true },
          { "feature": "Weekly one-on-one consultation with a mentor", "duration": "1-month", "included": true },
          { "feature": "Access to our alumni community", "duration": "1-month", "included": true },
          { "feature": "LinkedIn optimization Ebook", "duration": "lifetime", "included": true },
          { "feature": "Networking opportunities", "duration": "1-month", "included": true }
        ]
      },
      "gold": {
        "name": "Gold Plan",
        "price": 4080000,
        "currency": "NGN",
        "billing": "monthly",
        "description": "Premium monthly subscription with full access",
        "features": [
          { "feature": "Self-paced course with lifetime access", "duration": "lifetime", "included": true },
          { "feature": "AI Tutor", "duration": "1-month", "included": true },
          { "feature": "Certificate upon course completion", "duration": "lifetime", "included": true },
          { "feature": "Weekly one-on-one consultation with a mentor", "duration": "1-month", "included": true },
          { "feature": "Access to premium learning resources", "duration": "lifetime", "included": true },
          { "feature": "Access to our alumni community", "duration": "1-month", "included": true },
          { "feature": "LinkedIn optimization Ebook", "duration": "lifetime", "included": true },
          { "feature": "Networking opportunities", "duration": "1-month", "included": true }
        ]
      }
    },
    "message": "Subscription plans retrieved successfully"
  }
}
```

## 2. **Initialize Subscription Payment**
```http
POST /api/v1/subscriptions/initialize
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "planType": "gold"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/0peioxfhpn",
    "reference": "TJ_SUB_a1b2c3d4e5f6789abcdef12",
    "subscription": {
      "_id": "64a1b2c3d4e5f6789abcdef1",
      "user": "685ec527584981004042f25e",
      "plan": "gold",
      "amount": 4080000,
      "currency": "NGN",
      "status": "pending",
      "startDate": "2025-01-07T15:30:00.000Z",
      "endDate": "2025-02-07T15:30:00.000Z",
      "isRecurring": true,
      "featureAccess": {
        "aiTutor": { "hasAccess": true, "expiresAt": "2025-02-07T15:30:00.000Z" },
        "mentorship": { "hasAccess": true, "expiresAt": "2025-02-07T15:30:00.000Z" },
        "courseAccess": { "hasLifetimeAccess": true },
        "certificate": { "hasAccess": true }
      }
    }
  }
}
```

## 3. **Get User's Subscription Status**
```http
GET /api/v1/subscriptions/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "hasActiveSubscription": true,
    "activePlans": ["gold"],
    "totalActiveSubscriptions": 1,
    "featureAccess": {
      "aiTutor": true,
      "mentorship": true,
      "courseAccess": true,
      "premiumResources": true,
      "certificate": true,
      "alumniCommunity": true,
      "linkedinOptimization": true,
      "networking": true
    },
    "subscriptions": [
      {
        "plan": "gold",
        "endDate": "2025-02-07T15:30:00.000Z",
        "isRecurring": true
      }
    ]
  }
}
```

## **Subscription cURL Examples:**

### 1. Get Subscription Plans
```bash
curl -X GET http://localhost:4000/api/v1/subscriptions/plans
```

### 2. Initialize Subscription
```bash
curl -X POST http://localhost:4000/api/v1/subscriptions/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "planType": "gold"
  }'
```

### 3. Verify Subscription
```bash
curl -X GET http://localhost:4000/api/v1/subscriptions/verify/TJ_SUB_a1b2c3d4e5f6789abcdef12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get User Subscriptions
```bash
curl -X GET http://localhost:4000/api/v1/subscriptions/my-subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Get Subscription Status
```bash
curl -X GET http://localhost:4000/api/v1/subscriptions/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🤖 **AI Tutor API Examples & Testing**

### **AI Tutor Features (Subscription Required)**

All AI Tutor endpoints require an active subscription with AI Tutor access (Bronze, Silver, or Gold plans).

## 1. **Get AI Tutor Access Information**
```http
GET /api/v1/ai-tutor/access
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (User with Access):**
```json
{
  "status": "success",
  "data": {
    "hasAccess": true,
    "activePlans": ["gold"],
    "totalActiveSubscriptions": 1,
    "availableFeatures": [
      "Topic explanations and educational content",
      "Personalized study plan generation", 
      "Question and answer assistance",
      "Practice exercises and challenges",
      "Learning guidance and tips"
    ]
  }
}
```

**Response (User without Access):**
```json
{
  "status": "success",
  "data": {
    "hasAccess": false,
    "activePlans": [],
    "totalActiveSubscriptions": 0,
    "upgradeMessage": "Subscribe to Bronze, Silver, or Gold plan to access AI Tutor features",
    "availablePlans": [
      {
        "name": "Bronze Plan",
        "price": "₦15,800",
        "aiTutorDuration": "1 month"
      },
      {
        "name": "Silver Plan",
        "price": "₦30,000", 
        "aiTutorDuration": "1 month"
      },
      {
        "name": "Gold Plan",
        "price": "₦50,000",
        "aiTutorDuration": "1 month"
      }
    ]
  }
}
```

## 2. **Get Topic Explanation**
```http
POST /api/v1/ai-tutor/explain
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "topic": "React Hooks",
  "userLevel": "intermediate",
  "specificQuestions": [
    "What is the difference between useState and useEffect?",
    "How do I handle side effects properly?"
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "topic": "React Hooks",
    "userLevel": "intermediate",
    "explanation": "# React Hooks Explained\n\nReact Hooks are functions that let you use state and other React features in functional components...\n\n## Key Concepts\n1. **useState Hook**: Manages component state\n2. **useEffect Hook**: Handles side effects\n3. **Rules of Hooks**: Only call at top level...\n\n## Real-world Applications\n- Form handling with useState\n- API calls with useEffect\n- Custom hooks for reusable logic...",
    "generatedAt": "2025-01-07T15:30:00.000Z",
    "model": "llama3-8b-8192",
    "metadata": {
      "tokens_used": 256,
      "response_time": 1672531800000
    }
  }
}
```

## 3. **Generate Study Plan**
```http
POST /api/v1/ai-tutor/study-plan
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "topic": "Full Stack Web Development",
  "duration": "2 weeks",
  "goals": [
    "Build a complete web application",
    "Learn both frontend and backend development",
    "Deploy to production"
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "topic": "Full Stack Web Development",
    "duration": "2 weeks",
    "goals": ["Build a complete web application", "Learn both frontend and backend development", "Deploy to production"],
    "studyPlan": "# 2-Week Full Stack Web Development Study Plan\n\n## Week 1: Frontend Fundamentals\n\n### Day 1-2: HTML & CSS Mastery\n- Learning objectives: Master semantic HTML and responsive CSS\n- Activities: Build 3 responsive landing pages\n- Resources: MDN Web Docs, Flexbox Froggy\n\n### Day 3-4: JavaScript Essentials\n- Learning objectives: ES6+ features and DOM manipulation\n- Activities: Build interactive JavaScript projects\n\n### Day 5-7: React Framework\n- Learning objectives: Components, state, props, hooks\n- Practice: Build a todo app with React\n\n## Week 2: Backend & Deployment\n\n### Day 8-10: Node.js & Express\n- Learning objectives: Server setup, API creation, middleware\n- Activities: Build REST API with authentication\n\n### Day 11-12: Database Integration\n- Learning objectives: MongoDB/PostgreSQL integration\n- Practice: Connect frontend to backend\n\n### Day 13-14: Deployment & Production\n- Learning objectives: Deploy full stack app\n- Activities: Deploy to Heroku/Vercel\n\n## Assessment Checkpoints\n- Day 7: Frontend portfolio review\n- Day 14: Full stack application presentation\n\n## Success Tips\n- Code daily for at least 3-4 hours\n- Join developer communities for support\n- Build projects, not just tutorials",
    "generatedAt": "2025-01-07T15:30:00.000Z",
    "model": "llama3-8b-8192"
  }
}
```

## 4. **Ask AI Tutor a Question**
```http
POST /api/v1/ai-tutor/question
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "question": "How do I optimize database queries in MongoDB?",
  "context": "I have a Node.js application with MongoDB and some queries are slow",
  "userLevel": "intermediate"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "question": "How do I optimize database queries in MongoDB?",
    "context": "I have a Node.js application with MongoDB and some queries are slow",
    "userLevel": "intermediate",
    "answer": "# MongoDB Query Optimization\n\nHere are key strategies to optimize your MongoDB queries:\n\n## 1. **Create Proper Indexes**\n```javascript\n// Create index on frequently queried fields\ndb.users.createIndex({ email: 1 })\ndb.products.createIndex({ category: 1, price: -1 })\n```\n\n## 2. **Use Query Projections**\n```javascript\n// Only fetch needed fields\ndb.users.find({}, { name: 1, email: 1, _id: 0 })\n```\n\n## 3. **Limit and Pagination**\n```javascript\n// Use limit and skip for pagination\ndb.posts.find().limit(10).skip(20)\n```\n\n## 4. **Aggregation Pipeline Optimization**\n- Use $match early in pipeline\n- Use $limit after $match\n- Consider $lookup performance\n\n## 5. **Monitor with explain()**\n```javascript\ndb.collection.find({}).explain('executionStats')\n```\n\nFocus on indexes first - they provide the biggest performance improvement for most queries.",
    "generatedAt": "2025-01-07T15:30:00.000Z",
    "model": "llama3-8b-8192"
  }
}
```

## 5. **Generate Practice Exercises**
```http
POST /api/v1/ai-tutor/exercises
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "topic": "JavaScript Array Methods",
  "difficulty": "intermediate",
  "count": 3
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "topic": "JavaScript Array Methods",
    "difficulty": "intermediate",
    "exerciseCount": 3,
    "exercises": "# JavaScript Array Methods - Practice Exercises\n\n## Exercise 1: Data Transformation Challenge\n**Title**: E-commerce Product Filter\n\n**Problem Statement**: You have an array of products with properties: name, price, category, rating. Create functions using array methods to:\n- Filter products by category and minimum rating\n- Sort by price (low to high)\n- Transform to include only name and discounted price (10% off)\n\n**Learning Objectives**: Master filter(), sort(), and map() methods\n\n**Hints**: Chain array methods for elegant solutions\n\n**Expected Outcome**: Clean, functional approach to data manipulation\n\n## Exercise 2: Advanced Data Analysis\n**Title**: Student Grade Calculator\n\n**Problem Statement**: Given an array of student objects with subjects and scores, use array methods to:\n- Calculate average grade per student\n- Find top 3 performing students\n- Group students by grade level (A, B, C, D, F)\n\n**Learning Objectives**: Practice reduce(), sort(), and filter() combinations\n\n**Hints**: Use reduce() for calculations, sort() with custom comparator\n\n**Expected Outcome**: Complex data analysis using functional programming\n\n## Exercise 3: Real-world API Data Processing\n**Title**: Social Media Post Analyzer\n\n**Problem Statement**: Process an array of social media posts to:\n- Extract unique hashtags from all posts\n- Find posts with most engagement (likes + comments)\n- Create summary statistics (total posts, average engagement)\n\n**Learning Objectives**: Apply flatMap(), reduce(), and Set operations\n\n**Hints**: Consider using Set for unique values, flatMap for nested arrays\n\n**Expected Outcome**: Practical data processing skills for real applications",
    "generatedAt": "2025-01-07T15:30:00.000Z",
    "model": "llama3-8b-8192"
  }
}
```

## 6. **Get AI Tutor Service Status**
```http
GET /api/v1/ai-tutor/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "status": "operational",
    "message": "AI Tutor service is running properly",
    "availableModels": ["llama3-8b-8192"],
    "testResponse": "AI Tutor service is operational",
    "timestamp": "2025-01-07T15:30:00.000Z",
    "userAccess": {
      "hasAccess": true,
      "subscriptionPlans": ["gold"]
    }
  }
}
```

## **AI Tutor cURL Examples:**

### 1. Get Access Info
```bash
curl -X GET http://localhost:4000/api/v1/ai-tutor/access \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Get Topic Explanation  
```bash
curl -X POST http://localhost:4000/api/v1/ai-tutor/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "topic": "React Hooks",
    "userLevel": "intermediate",
    "specificQuestions": ["What is useState?", "How does useEffect work?"]
  }'
```

### 3. Generate Study Plan
```bash
curl -X POST http://localhost:4000/api/v1/ai-tutor/study-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "topic": "Machine Learning Basics",
    "duration": "1 month",
    "goals": ["Understand ML algorithms", "Build first ML model"]
  }'
```

### 4. Ask Question
```bash
curl -X POST http://localhost:4000/api/v1/ai-tutor/question \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "question": "What is the difference between let and const in JavaScript?",
    "userLevel": "beginner"
  }'
```

### 5. Generate Exercises
```bash
curl -X POST http://localhost:4000/api/v1/ai-tutor/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "topic": "Python Functions",
    "difficulty": "beginner",
    "count": 2
  }'
```

### 6. Check Service Status
```bash
curl -X GET http://localhost:4000/api/v1/ai-tutor/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## **Enhanced Login Response with Payment Status**g and management
- Real-time video conferencing
- Participant management
- Live chat/comments during classes
- Class notifications
- Meeting room generation

### ✅ **Phase 4: Pre-recorded Content & File Upload**
- Video upload with Cloudinary
- Automatic thumbnail generation
- Class resources management
- Multi-format file support
- Download tracking
- Access control

### ✅ **Phase 5: Booking & Availability System**
- Tutor availability management
- Session booking and scheduling
- Conflict detection and prevention
- Booking status management
- Session feedback and ratings
- Booking statistics and analytics

### ✅ **Phase 6: Payment System (Paystack Integration)**
- Course payment processing with Paystack
- Payment link generation
- Payment verification and status tracking
- Webhook handling for real-time updates
- Course access control based on payment
- Payment history and transaction tracking

### ✅ **Phase 7: Subscription Management System**
- Three-tier subscription plans (Bronze, Silver, Gold)
- Monthly and one-time payment options
- Feature-based access control
- AI Tutor access management
- Mentorship session tracking
- Alumni community access
- Automatic subscription status tracking

### ✅ **Phase 8: AI-Powered Learning System**
- Groq API integration with Llama 3 8B model
- Topic explanations and educational content generation
- Personalized study plan creation
- Interactive Q&A system
- Automatic practice exercise generation
- Subscription-based access control
- Rate limiting for AI generation endpoints

---

## 📋 **Complete API Endpoints**

### **🔐 Authentication Endpoints**
```
POST   /api/v1/auth/register          # Email registration + send OTP
POST   /api/v1/auth/verify-otp        # Verify email OTP
POST   /api/v1/auth/resend-otp        # Resend OTP
POST   /api/v1/auth/set-password      # Set password after verification
POST   /api/v1/auth/login             # User login
POST   /api/v1/auth/forgot-password   # Request password reset
POST   /api/v1/auth/reset-password    # Reset password with token
```

### **👤 User Profile Endpoints**
```
POST   /api/v1/user/profile                # Complete profile setup
GET    /api/v1/user/profile                # Get user profile
PUT    /api/v1/user/profile                # Update profile
PUT    /api/v1/user/profile/with-picture   # Update profile with picture
POST   /api/v1/user/profile/picture        # Upload profile picture only
GET    /api/v1/user/dashboard              # User dashboard with progress
POST   /api/v1/user/promote-role           # Promote user role (dev only)

# Admin User Management
GET    /api/v1/user/admin/students         # Get all students (admin only)
GET    /api/v1/user/admin/students/:studentId # Get specific student by ID (admin only)
```

### **📚 Course Management Endpoints**
```
# Public Course Endpoints
GET    /api/v1/courses                # Get all published courses
GET    /api/v1/courses/:id            # Get course details
GET    /api/v1/courses/:id/curriculum # Get course curriculum

# Student Course Endpoints (Protected)
POST   /api/v1/courses/enroll         # Enroll in course
GET    /api/v1/courses/my-courses     # Get user's enrolled courses
POST   /api/v1/courses/:id/progress   # Update lesson progress
GET    /api/v1/courses/:id/progress   # Get course progress

# Admin/Tutor Course Endpoints (Protected)
GET    /api/v1/courses/admin/all       # Get all courses (including drafts)
POST   /api/v1/courses                 # Create new course
PUT    /api/v1/courses/:id             # Update course  
PUT    /api/v1/courses/:id/publish     # Publish course (draft → published)
DELETE /api/v1/courses/:id             # Delete course
POST   /api/v1/courses/:id/curriculum  # Add curriculum to course
/api/v1/courses/admin/all
?status=draft          # Filter by specific status
?status=published      # Filter by published only
?category=programming  # Filter by category
?search=python        # Search in course titles/descriptions
?page=1&limit=10      # Pagination
Publish Course
Endpoint: PUT /api/v1/courses/:courseId/publish
GET /api/v1/courses/admin/all?status=draft
Authorization: Bearer YOUR_JWT_TOKEN
```

### **🎥 Pre-recorded Content Endpoints**
```
# Video Class Management (Admin/Tutor)
POST   /api/v1/content/video-classes               # Upload video class
GET    /api/v1/content/instructor/video-classes    # Get instructor's videos
PUT    /api/v1/content/video-classes/:classId      # Update video class
DELETE /api/v1/content/video-classes/:classId      # Delete video class

# Student Video Access
GET    /api/v1/content/courses/:courseId/video-classes # Get course videos
GET    /api/v1/content/video-classes/:classId           # Get single video
GET    /api/v1/content/public/courses/:courseId/video-classes # Public access

# Class Resources
POST   /api/v1/content/resources                    # Upload class resource
GET    /api/v1/content/classes/:classId/resources   # Get class resources
GET    /api/v1/content/resources/:resourceId/download # Download resource
DELETE /api/v1/content/resources/:resourceId        # Delete resource
```

### **🔴 Live Classes Endpoints**
```
# Admin/Tutor Live Class Management
POST   /api/v1/live-classes                # Schedule live class
GET    /api/v1/live-classes/instructor     # Get instructor's classes
PUT    /api/v1/live-classes/:classId/start # Start live class
PUT    /api/v1/live-classes/:classId/end   # End live class
PUT    /api/v1/live-classes/:classId       # Update live class
DELETE /api/v1/live-classes/:classId       # Cancel live class

# Student Live Class Participation
GET    /api/v1/live-classes                # Get scheduled classes
POST   /api/v1/live-classes/:classId/join  # Join live class
POST   /api/v1/live-classes/:classId/leave # Leave live class

# Live Class Communication
POST   /api/v1/live-classes/:classId/comments # Add comment during class
GET    /api/v1/live-classes/:classId/comments # Get class comments
```

### **📅 Booking & Availability Endpoints**
```
# Tutor Availability
POST   /api/v1/bookings/availability          # Set tutor availability (tutor/admin)
GET    /api/v1/bookings/availability/:tutorId # Get tutor availability

# Session Booking
POST   /api/v1/bookings/sessions              # Book a session (student/admin)
GET    /api/v1/bookings/sessions              # Get user bookings
GET    /api/v1/bookings/sessions/:bookingId   # Get booking details

# Session Management
PATCH  /api/v1/bookings/sessions/:bookingId/status      # Update booking status
POST   /api/v1/bookings/sessions/:bookingId/cancel      # Cancel booking
PATCH  /api/v1/bookings/sessions/:bookingId/reschedule  # Reschedule booking
POST   /api/v1/bookings/sessions/:bookingId/complete    # Complete session (tutor/admin)

# Feedback & Analytics
POST   /api/v1/bookings/sessions/:bookingId/feedback    # Submit session feedback
GET    /api/v1/bookings/stats                           # Get session statistics (tutor/admin)
GET    /api/v1/bookings/sessions/participants           # Get session participants (tutor/admin)

### **Group Booking Features**
- **Maximum Participants:** Up to 5 students can book the same session slot
- **Session Type:** Automatically changes to "group" when multiple students book
- **Availability:** Tutors can set `maxBookings` per time slot (defaults to 5)  
- **Meeting URL:** All participants in the same session share the same meeting URL
- **Pricing:** Each student pays individually for their booking
```

### **💳 Payment & Billing Endpoints**
```
# Course Payment
POST   /api/v1/payments/initialize        # Initialize course payment (student)
GET    /api/v1/payments/verify/:reference # Verify payment status (student)
GET    /api/v1/payments/details/:reference # Get payment details (student)
POST   /api/v1/payments/webhook           # Handle Paystack webhook (public)

# User Payments
GET    /api/v1/payments/my-courses        # Get user's paid courses
GET    /api/v1/payments/summary           # Get user's payment summary
GET    /api/v1/payments/status            # Get user's payment status (for login integration)
```

### **🔑 Subscription Management Endpoints**
```
# Subscription Plans
GET    /api/v1/subscriptions/plans        # Get all subscription plans (public)

# Subscription Management
POST   /api/v1/subscriptions/initialize   # Initialize subscription payment (student)
GET    /api/v1/subscriptions/verify/:reference # Verify subscription payment (student)
GET    /api/v1/subscriptions/details/:reference # Get subscription details (student)
POST   /api/v1/subscriptions/webhook      # Handle subscription webhook (public)

# User Subscriptions
GET    /api/v1/subscriptions/my-subscriptions # Get user's subscriptions
GET    /api/v1/subscriptions/status       # Get user's subscription status
```

### **🤖 AI Tutor Endpoints (Subscription Required)**
```
# AI Tutor Access & Status
GET    /api/v1/ai-tutor/access            # Get user's AI Tutor access information
GET    /api/v1/ai-tutor/status            # Get AI Tutor service status

# AI Learning Features
POST   /api/v1/ai-tutor/explain           # Get AI explanation of a topic
POST   /api/v1/ai-tutor/study-plan        # Generate AI study plan for a topic
POST   /api/v1/ai-tutor/question          # Ask AI Tutor a specific question
POST   /api/v1/ai-tutor/exercises         # Generate practice exercises for a topic
```

---

## 🛠 **Technical Features Implemented**

### **Security & Performance**
- **Rate Limiting**: Different limits for auth, uploads, comments
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Joi schema validation for all endpoints
- **File Upload Security**: Type and size validation
- **XSS Protection**: Clean malicious input
- **MongoDB Injection Protection**: Sanitize database queries

### **File Upload & Storage**
- **Cloudinary Integration**: Video, image, and document storage
- **Multi-format Support**: Videos (MP4, AVI, MOV), Images (JPG, PNG), Documents (PDF, DOC, PPT)
- **Automatic Processing**: Video compression and thumbnail generation
- **Progress Tracking**: Upload and processing status
- **Access Control**: Free, premium, and enrolled-only resources

### **Real-time Features**
- **Live Video Conferencing**: Jitsi Meet integration (no API keys needed)
- **Live Chat**: Real-time comments during classes
- **Notifications**: Class scheduling, reminders, and status updates
- **Participant Management**: Join/leave tracking

### **Email System**
- **Professional Templates**: Modern HTML email designs
- **OTP Verification**: Secure 6-digit codes with expiration
- **Welcome Emails**: Onboarding email sequences
- **Class Notifications**: Automated email alerts

### **AI-Powered Learning**
- **Groq API Integration**: Advanced AI tutoring with Llama 3 8B model
- **Topic Explanations**: AI-generated educational content and explanations
- **Study Plan Generation**: Personalized learning roadmaps and schedules
- **Interactive Q&A**: AI-powered question answering system
- **Practice Exercises**: Automatically generated coding challenges and problems
- **Subscription-Based Access**: Feature access control tied to subscription plans
- **Rate Limiting**: Specialized limits for AI generation endpoints

---

## 📊 **Database Models**

### **User Management**
- `User` - User accounts with profiles and authentication
- `UserCourseProgress` - Detailed progress tracking

### **Course Structure**
- `Course` - Main course information and metadata
- `Module` - Course modules/chapters
- `Lesson` - Individual lessons within modules
- `PrerecordedClass` - Video lessons with Cloudinary integration
- `ClassResource` - Downloadable resources and materials

### **Live Learning**
- `LiveClass` - Live class sessions with Jitsi Meet
- `ClassComment` - Real-time chat during live classes
- `ClassNotification` - Automated notification system

### **Booking System**
- `TutorAvailability` - Tutor availability slots and schedules
- `BookingSession` - Session bookings with status tracking and feedback

### **Payment System**
- `CoursePayment` - Course payment transactions and status tracking

### **Booking & Availability**
- `Booking` - Session bookings and availability
- `TutorAvailability` - Tutor's available time slots
- `SessionFeedback` - Feedback for completed sessions

### **Subscription System**
- `Subscription` - User subscription records with feature access tracking

### **Payment & Billing**
- `Payment` - Payment transactions and status
- `PaymentReference` - Unique references for payment verification
- `WebhookLog` - Logs for webhook events from Paystack

---

## 🎯 **Completed: Full LMS Backend System**

All phases have been successfully implemented:
- ✅ Authentication & User Management
- ✅ Course Management System
- ✅ Live Classes with Video Conferencing
- ✅ Pre-recorded Content & File Upload
- ✅ Booking & Availability System
- ✅ Payment System (Paystack Integration)
- ✅ Subscription Management System
- ✅ AI-Powered Learning System (Groq Integration)

---

## 💡 **Key Technologies Used**

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT tokens, bcrypt hashing
- **Validation**: Joi schema validation
- **File Storage**: Cloudinary (videos, images, documents)
- **Email**: Nodemailer with HTML templates
- **Video Conferencing**: Jitsi Meet (free, no API keys)
- **AI Integration**: Groq SDK with Llama 3 8B model for AI tutoring
- **Security**: Rate limiting, XSS protection, input sanitization
- **File Upload**: Multer with memory storage
- **Booking System**: Conflict detection, scheduling, feedback
- **Payment Integration**: Paystack API for payment processing and webhooks

---

## 🚀 **Complete & Ready to Use!**

Your TechyJaunt Learning Management System is now fully functional with:
- Complete user authentication flow with OTP verification
- Course management with progress tracking
- Live classes with video conferencing
- Pre-recorded content with file upload
- Tutor availability and session booking system
- Payment processing with Paystack integration
- Subscription management with feature-based access control
- AI-powered tutoring system with Groq integration
- Professional email notifications
- Comprehensive API documentation
- Rate limiting and security measures
- Optimized database connections and error handling

The system is ready for frontend integration and production deployment!

## 🔧 **Server Configuration & Troubleshooting**

### **Database Connection Optimizations**
- Enhanced MongoDB connection with proper timeout settings
- Connection pooling for better performance
- Automatic reconnection handling
- Query timeouts to prevent hanging requests

### **Performance Improvements**
- Optimized admin endpoints with aggregation queries
- Fallback mechanisms for database operations
- Efficient pagination and search functionality
- Proper error handling and logging

### **Running the Server**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start

# Test database connection
npm run test:db

# Test admin endpoint
bash test-admin-endpoint.sh
```

### **Health Check**
```
GET /health       # Check server status and environment info
GET /server-info  # Get server IP and configuration for Paystack whitelisting
GET /ip          # Get simple IP address information
```

### **Recent Fixes Applied**
- ✅ Fixed MongoDB connection options for latest Mongoose version
- ✅ Resolved ECONNRESET database connection errors
- ✅ Optimized admin student queries with proper error handling
- ✅ Removed duplicate server logs and database connection messages
- ✅ Enhanced query performance with aggregation pipelines
- ✅ Added fallback mechanisms for failed operations

---

## 🌐 **Server Information Endpoints**

### **Get Server IP for Paystack Whitelisting**
```http
GET /server-info
```

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-01-07T15:30:00.000Z",
  "environment": "production",
  "server": {
    "clientIP": "203.0.113.1",
    "publicIP": "203.0.113.1",
    "headers": {
      "x-forwarded-for": "203.0.113.1",
      "x-real-ip": "203.0.113.1",
      "host": "api.techyjaunt.com",
      "origin": "https://techyjaunt.com"
    },
    "hostname": "api.techyjaunt.com",
    "protocol": "https",
    "baseUrl": "https://api.techyjaunt.com",
    "port": 4000,
    "webhookUrl": "https://api.techyjaunt.com/api/v1/payments/webhook",
    "instructions": {
      "paystack": "Use the 'publicIP' or 'clientIP' value to whitelist in Paystack dashboard",
      "webhook": "Use the 'webhookUrl' for Paystack webhook configuration",
      "note": "If deployed behind a proxy/load balancer, check x-forwarded-for header"
    }
  }
}
```

### **Get Simple IP Address**
```http
GET /ip
```

**Response:**
```json
{
  "ip": "203.0.113.1",
  "forwarded": "203.0.113.1",
  "realIP": "203.0.113.1",
  "timestamp": "2025-01-07T15:30:00.000Z"
}
```

### **Paystack Whitelisting Instructions**

1. **Get Your Server IP:**
   ```bash
   curl https://your-domain.com/server-info
   # or
   curl https://your-domain.com/ip
   ```

2. **Whitelist in Paystack:**
   - Go to Paystack Dashboard → Settings → Webhooks
   - Add your webhook URL: `https://your-domain.com/api/v1/payments/webhook`
   - Whitelist the IP address returned from `/server-info`

3. **Test Your Webhook:**
   ```bash
   # Test webhook endpoint
   curl -X POST https://your-domain.com/api/v1/payments/webhook \
     -H "Content-Type: application/json" \
     -H "x-paystack-signature: test-signature" \
     -d '{"event":"charge.success","data":{"reference":"test"}}'
   ```

---

## 💳 **Payment API Examples & Testing**

### **Real Payment Examples with Working Data**

## 1. **Initialize Course Payment**
```http
POST /api/v1/payments/initialize
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "courseId": "68561f125f6bb4ec70d664c9",
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/0peioxfhpn",
    "reference": "TJ_a1b2c3d4e5f6789abcdef12"
  }
}
```

## 2. **Verify Payment Status**
```http
GET /api/v1/payments/verify/TJ_a1b2c3d4e5f6789abcdef12
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "user": "685ec527584981004042f25e",
    "course": "68561f125f6bb4ec70d664c9",
    "amount": 15000000,
    "currency": "NGN",
    "status": "success",
    "paymentMethod": "card",
    "transactionReference": "TJ_a1b2c3d4e5f6789abcdef12",
    "paystackReference": "1234567890",
    "createdAt": "2025-01-07T15:30:00.000Z",
    "updatedAt": "2025-01-07T15:35:00.000Z"
  }
}
```

## 3. **Get Payment Details**
```http
GET /api/v1/payments/details/TJ_a1b2c3d4e5f6789abcdef12
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "user": {
      "_id": "685ec527584981004042f25e",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "course": {
      "_id": "68561f125f6bb4ec70d664c9",
      "title": "Complete Full Stack Web Development with React & Node.js",
      "price": 150000
    },
    "amount": 15000000,
    "currency": "NGN",
    "status": "success",
    "paymentMethod": "card",
    "transactionReference": "TJ_a1b2c3d4e5f6789abcdef12",
    "paystackReference": "1234567890",
    "metadata": {
      "authorization": {
        "authorization_code": "AUTH_code",
        "bin": "408408",
        "last4": "4081",
        "exp_month": "12",
        "exp_year": "2030",
        "channel": "card",
        "card_type": "visa",
        "bank": "Test Bank",
        "country_code": "NG",
        "brand": "visa"
      }
    },
    "createdAt": "2025-01-07T15:30:00.000Z",
    "updatedAt": "2025-01-07T15:35:00.000Z"
  }
}
```

## 5. **Get User's Paid Courses**
```http
GET /api/v1/payments/my-courses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "paymentId": "64a1b2c3d4e5f6789abcdef1",
      "course": {
        "_id": "68561f125f6bb4ec70d664c9",
        "title": "Complete Full Stack Web Development with React & Node.js",
        "description": "Learn modern web development with React and Node.js",
        "thumbnail": "https://res.cloudinary.com/...",
        "category": "programming",
        "level": "intermediate",
        "price": 150000,
        "duration": "40 hours"
      },
      "amount": 15000000,
      "currency": "NGN",
      "paymentMethod": "card",
      "transactionReference": "TJ_a1b2c3d4e5f6789abcdef12",
      "paidAt": "2025-01-07T15:30:00.000Z",
      "metadata": {
        "authorization": {
          "authorization_code": "AUTH_code",
          "last4": "4081",
          "card_type": "visa"
        }
      }
    }
  ]
}
```

## 6. **Get User's Payment Summary**
```http
GET /api/v1/payments/summary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalPaid": 15000000,
    "totalAmount": 15000000,
    "successfulPayments": 1,
    "failedPayments": 0,
    "pendingPayments": 0
  }
}
```

## 7. **Get User's Payment Status (for Login Integration)**
```http
GET /api/v1/payments/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "hasPaidCourses": true,
    "totalPaidCourses": 2,
    "totalPayments": 3,
    "totalAmountPaid": 22500000,
    "paidCourseIds": [
      "68561f125f6bb4ec70d664c9",
      "68561f245f6bb4ec70d664cd"
    ]
  }
}
```

## 8. **Paystack Webhook (Public)**
```http
POST /api/v1/payments/webhook
Content-Type: application/json
x-paystack-signature: t=1578911700,v1=f6a30cffb4b7b6e8e2cb9b2ff1f3b6f9a8c8d9e0f1e2d3c4b5a6f7e8d9c0b1a2
```

**Request Body (sent by Paystack):**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "TJ_a1b2c3d4e5f6789abcdef12",
    "amount": 15000000,
    "currency": "NGN",
    "transaction_date": "2025-01-07T15:35:00.000Z",
    "status": "success",
    "gateway_response": "Successful",
    "customer": {
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "authorization": {
      "authorization_code": "AUTH_code",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2030",
      "channel": "card",
      "card_type": "visa",
      "bank": "Test Bank",
      "country_code": "NG",
      "brand": "visa"
    },
    "metadata": {
      "custom_fields": [
        {
          "display_name": "Course Name",
          "variable_name": "course_name",
          "value": "Complete Full Stack Web Development with React & Node.js"
        },
        {
          "display_name": "Student Name",
          "variable_name": "student_name",
          "value": "John Doe"
        }
      ]
    }
  }
}
```

**Response:**
```json
{
  "status": "success"
}
```

## **cURL Examples:**

### 1. Initialize Payment
```bash
curl -X POST http://localhost:4000/api/v1/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseId": "68561f125f6bb4ec70d664c9",
    "paymentMethod": "card"
  }'
```

### 2. Verify Payment
```bash
curl -X GET http://localhost:4000/api/v1/payments/verify/TJ_a1b2c3d4e5f6789abcdef12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Payment Details
```bash
curl -X GET http://localhost:4000/api/v1/payments/details/TJ_a1b2c3d4e5f6789abcdef12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Webhook (Usually sent by Paystack)
```bash
curl -X POST http://localhost:4000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: t=1578911700,v1=f6a30cffb4b7b6e8e2cb9b2ff1f3b6f9a8c8d9e0f1e2d3c4b5a6f7e8d9c0b1a2" \
  -d '{"event":"charge.success","data":{"reference":"TJ_a1b2c3d4e5f6789abcdef12","amount":15000000,"status":"success"}}'
```

### 5. Get User's Paid Courses
```bash
curl -X GET http://localhost:4000/api/v1/payments/my-courses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Get User's Payment Summary
```bash
curl -X GET http://localhost:4000/api/v1/payments/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Get User's Payment Status
```bash
curl -X GET http://localhost:4000/api/v1/payments/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## **Enhanced Login Response with Payment Status**

The login endpoint now includes user payment status for better frontend experience:

### **Login Response Example:**
```json
{
  "status": "success",
  "data": {
    "message": "Login successful",
    "user": {
      "_id": "685ec527584981004042f25e",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "student",
      "profileCompleted": true,
      "emailVerified": true,
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenExpiresAt": "2025-01-09T15:30:00.000Z",
    "paymentStatus": {
      "hasPaidCourses": true,
      "totalPaidCourses": 2,
      "totalPayments": 3,
      "totalAmountPaid": 22500000,
      "paidCourseIds": [
        "68561f125f6bb4ec70d664c9",
        "68561f245f6bb4ec70d664cd"
      ]
    },
    "subscriptionStatus": {
      "hasActiveSubscription": true,
      "activePlans": ["gold"],
      "totalActiveSubscriptions": 1,
      "featureAccess": {
        "aiTutor": true,
        "mentorship": true,
        "courseAccess": true,
        "premiumResources": true,
        "certificate": true,
        "alumniCommunity": true,
        "linkedinOptimization": true,
        "networking": true
      },
      "subscriptions": [
        {
          "plan": "gold",
          "endDate": "2025-02-07T15:30:00.000Z",
          "isRecurring": true
        }
      ]
    }
  }
}
```

### **Frontend Integration:**
```javascript
// Example usage in your frontend
const loginResponse = await loginUser(email, password);
const { user, token, paymentStatus, subscriptionStatus } = loginResponse.data;

// Check subscription status
if (subscriptionStatus.hasActiveSubscription) {
  // User has active subscription
  console.log(`User has active subscriptions: ${subscriptionStatus.activePlans.join(', ')}`);
  
  // Check specific features
  if (subscriptionStatus.featureAccess.aiTutor) {
    // Show AI Tutor access
  }
  
  if (subscriptionStatus.featureAccess.mentorship) {
    // Show mentorship booking
  }
  
  if (subscriptionStatus.featureAccess.courseAccess) {
    // Show premium course access
  }
} else {
  // User has no active subscription - show subscription plans
  console.log('User has no active subscription');
}

// Check course payments (still available alongside subscriptions)
if (paymentStatus.hasPaidCourses) {
  console.log(`User has paid for ${paymentStatus.totalPaidCourses} individual courses`);
}
```

## **Payment Flow:**

1. **Student clicks "Buy Course"** → Frontend calls `/payments/initialize`
2. **Backend creates payment record** → Returns Paystack authorization URL
3. **Student redirects to Paystack** → Completes payment
4. **Paystack sends webhook** → Backend updates payment status
5. **Student returns to frontend** → Frontend calls `/payments/verify` to confirm
6. **Student can now enroll** → Course enrollment is allowed

## **Error Responses:**

```json
{
  "status": "error",
  "message": "Course not found"
}
```

```json
{
  "status": "error",
  "message": "You have already purchased this course"
}
```

```json
{
  "status": "error",
  "message": "Payment not found"
}
```

## **Test Data:**

Use these real course IDs from the database for testing:
- `68561f125f6bb4ec70d664c9` - Complete Full Stack Web Development with React & Node.js (₦150,000)
- `68561f245f6bb4ec70d664cd` - Introduction to Data Science with Python (₦75,000)

**Note:** Amounts are stored in kobo (multiply by 100), so ₦150,000 = 15,000,000 kobo

**Testing Scripts:**
```bash
# Test database connection
npm run test:db

# Test payment initialization
bash test-payment-init.sh

# Test payment service
node test-payment-service.js

# Check available courses
node check-courses.js
```

---

## Database Setup for Subscription Plans

### Migration and Seeding

Subscription plans are now stored in the database for better management and flexibility. To set up the plans:

**1. Run Migration (Safe - won't duplicate existing plans):**
```bash
npm run migrate:subscription-plans
```

**2. Run Seeder (Replaces all existing plans):**
```bash
npm run seed:subscription-plans
```

**3. Manual Database Operations:**
```bash
# View plans in MongoDB
use techyjaunt-db
db.subscriptionplans.find().pretty()

# Count total plans
db.subscriptionplans.countDocuments({ isActive: true })
```

### Plan Management

Plans can be dynamically managed through:
- Database operations (MongoDB Compass, CLI)
- Future admin panel endpoints
- Migration scripts for version control

### Plan Schema Structure

```javascript
{
  planType: "bronze|silver|gold",      // Unique identifier
  name: "Plan Display Name",           // User-friendly name
  price: 1580000,                      // Price in kobo (₦15,800)
  currency: "NGN",                     // Currency code
  billing: "one-time|monthly|yearly",  // Billing frequency
  description: "Plan description",      // Marketing description
  features: [                          // Array of features
    {
      feature: "Feature name",
      duration: "lifetime|1-month|etc",
      included: true,
      limit: null|number               // Optional usage limit
    }
  ],
  isActive: true,                      // Enable/disable plan
  sortOrder: 1,                        // Display order
  metadata: {                          // Additional data
    popular: false,
    recommended: true,
    lifetimeAccess: true
  }
}
```

---

## TODO
1. it is when tutors confirm that you should send the meeting details (send mails with the status update)
2. Send a mail for reschedules
3. send mail for completed session(sessions in the future can't be mark as completed)
4. a session that has been marked completed can't be cancelled(send mail when session is also cancelled)
5. Mail for live classes
6. Reminder For Live Classes