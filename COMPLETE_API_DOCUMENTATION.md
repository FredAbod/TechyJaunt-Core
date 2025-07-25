# TechyJaunt Learning Platform - Complete API Documentation

**Base URL:** `https://techyjaunt-core.onrender.com`

## Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [User Management Endpoints](#user-management-endpoints)
3. [Course Management Endpoints](#course-management-endpoints)
4. [Progress Tracking Endpoints](#progress-tracking-endpoints)
5. [Live Classes Endpoints](#live-classes-endpoints)
6. [Payment Endpoints](#payment-endpoints)
7. [Subscription Endpoints](#subscription-endpoints)
8. [AI Tutor Endpoints](#ai-tutor-endpoints)
9. [Booking Endpoints](#booking-endpoints)
10. [Assessment Endpoints](#assessment-endpoints)
11. [Webhook Endpoints](#webhook-endpoints)

---

## Authentication Endpoints

### 1. Register User
**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "User registered successfully. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "isVerified": false,
      "role": "student"
    },
    "otpSent": true
  }
}
```

### 2. Verify OTP
**POST** `/api/v1/auth/verify-otp`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "OTP verified successfully. Please set your password.",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "email": "john.doe@example.com",
      "isVerified": true
    },
    "nextStep": "set-password"
  }
}
```

### 3. Set Password
**POST** `/api/v1/auth/set-password`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password set successfully. You can now login.",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "email": "john.doe@example.com",
      "passwordSet": true
    }
  }
}
```

### 4. Login User
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "student",
      "profilePic": "https://cloudinary.com/profile.jpg"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### 5. Forgot Password
**POST** `/api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password reset link sent to your email",
  "data": {
    "resetLinkSent": true
  }
}
```

### 6. Reset Password
**POST** `/api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successfully",
  "data": {
    "passwordReset": true
  }
}
```

### 7. Resend OTP
**POST** `/api/v1/auth/resend-otp`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "OTP resent successfully",
  "data": {
    "otpSent": true
  }
}
```

---

## User Management Endpoints

### 1. Get User Profile
**GET** `/api/v1/user/profile`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "placeOfBirth": "New York",
      "course": "Web Development",
      "courseDuration": "6 months",
      "profilePic": "https://cloudinary.com/profile.jpg",
      "socialMedia": {
        "facebook": "john.doe.fb",
        "twitter": "@johndoe",
        "linkedin": "john-doe",
        "instagram": "@johndoe"
      },
      "deliveryAddress": {
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA"
      },
      "role": "student",
      "createdAt": "2021-06-21T15:30:00.000Z"
    }
  }
}
```

### 2. Update User Profile
**PUT** `/api/v1/user/profile`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "placeOfBirth": "New York",
  "course": "Web Development",
  "courseDuration": "6 months",
  "socialMedia": {
    "facebook": "john.doe.fb",
    "twitter": "@johndoe",
    "linkedin": "john-doe",
    "instagram": "@johndoe"
  },
  "deliveryAddress": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "profilePic": "https://cloudinary.com/profile.jpg",
      "updatedAt": "2021-06-21T15:30:00.000Z"
    }
  }
}
```

### 3. Upload Profile Picture
**POST** `/api/v1/user/profile/picture`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
profilePicture: <image_file>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Profile picture uploaded successfully",
  "data": {
    "profilePic": "https://cloudinary.com/new-profile.jpg",
    "profilePicPublicId": "profile_pics/user_123"
  }
}
```

### 4. Get User Dashboard
**GET** `/api/v1/user/dashboard`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Dashboard data retrieved successfully",
  "data": {
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "profilePic": "https://cloudinary.com/profile.jpg"
    },
    "stats": {
      "enrolledCourses": 3,
      "completedCourses": 1,
      "inProgressCourses": 2,
      "totalLessonsCompleted": 45,
      "averageProgress": 75.5,
      "certificatesEarned": 1,
      "hoursLearned": 120.5
    },
    "recentActivity": [
      {
        "type": "lesson_completed",
        "courseTitle": "React Development",
        "lessonTitle": "React Hooks",
        "date": "2021-06-21T15:30:00.000Z"
      }
    ],
    "enrolledCourses": [
      {
        "id": "60d0fe4f5311236168a109cb",
        "title": "React Development",
        "progress": 85,
        "thumbnail": "https://cloudinary.com/course-thumb.jpg",
        "lastAccessed": "2021-06-21T15:30:00.000Z"
      }
    ]
  }
}
```

---

## Course Management Endpoints

### 1. Get All Courses (Public)
**GET** `/api/v1/courses`

**Query Parameters:**
- `category` (optional): Filter by category
- `level` (optional): Filter by level (Beginner, Intermediate, Advanced)
- `search` (optional): Search by title or description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response (200):**
```json
{
  "status": "success",
  "message": "Courses retrieved successfully",
  "data": {
    "courses": [
      {
        "id": "60d0fe4f5311236168a109cb",
        "title": "Complete React Development",
        "description": "Learn React from basics to advanced concepts",
        "shortDescription": "Master React with hands-on projects",
        "category": "Web Development",
        "level": "Intermediate",
        "duration": "8 weeks",
        "price": 99900,
        "originalPrice": 149900,
        "thumbnail": "https://cloudinary.com/course-thumb.jpg",
        "image": "https://cloudinary.com/course-image.jpg",
        "prerequisites": ["HTML", "CSS", "JavaScript"],
        "learningOutcomes": [
          "Build modern React applications",
          "Understand React Hooks",
          "State management with Redux"
        ],
        "tags": ["React", "JavaScript", "Frontend"],
        "instructor": {
          "id": "60d0fe4f5311236168a109cc",
          "firstName": "Jane",
          "lastName": "Smith",
          "profilePic": "https://cloudinary.com/instructor.jpg"
        },
        "totalStudents": 1250,
        "avgRating": 4.8,
        "totalRatings": 324,
        "isPublished": true,
        "createdAt": "2021-06-21T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCourses": 47,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get Course by ID
**GET** `/api/v1/courses/:courseId`

**Response (200):**
```json
{
  "status": "success",
  "message": "Course retrieved successfully",
  "data": {
    "course": {
      "id": "60d0fe4f5311236168a109cb",
      "title": "Complete React Development",
      "description": "Learn React from basics to advanced concepts with hands-on projects",
      "shortDescription": "Master React with hands-on projects",
      "category": "Web Development",
      "level": "Intermediate",
      "duration": "8 weeks",
      "price": 99900,
      "originalPrice": 149900,
      "thumbnail": "https://cloudinary.com/course-thumb.jpg",
      "image": "https://cloudinary.com/course-image.jpg",
      "brochure": {
        "filename": "react-course-brochure.pdf",
        "url": "https://cloudinary.com/brochure.pdf",
        "size": 2048576
      },
      "prerequisites": ["HTML", "CSS", "JavaScript"],
      "learningOutcomes": [
        "Build modern React applications",
        "Understand React Hooks and Context API",
        "State management with Redux",
        "Testing React components"
      ],
      "tags": ["React", "JavaScript", "Frontend", "Hooks", "Redux"],
      "instructor": {
        "id": "60d0fe4f5311236168a109cc",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com",
        "profilePic": "https://cloudinary.com/instructor.jpg",
        "bio": "Senior React Developer with 8+ years experience"
      },
      "modules": [
        {
          "id": "60d0fe4f5311236168a109cd",
          "title": "React Fundamentals",
          "description": "Learn the basics of React",
          "order": 1,
          "duration": "2 weeks",
          "lessons": [
            {
              "id": "60d0fe4f5311236168a109ce",
              "title": "Introduction to React",
              "description": "What is React and why use it?",
              "duration": "30 minutes",
              "order": 1,
              "videoUrl": "https://cloudinary.com/lesson1.mp4",
              "isActive": true
            }
          ]
        }
      ],
      "totalStudents": 1250,
      "avgRating": 4.8,
      "totalRatings": 324,
      "ratings": [
        {
          "userId": "60d0fe4f5311236168a109cf",
          "rating": 5,
          "review": "Excellent course!",
          "createdAt": "2021-06-21T15:30:00.000Z"
        }
      ],
      "isPublished": true,
      "createdAt": "2021-06-21T15:30:00.000Z",
      "updatedAt": "2021-06-21T15:30:00.000Z"
    }
  }
}
```

### 3. Enroll in Course
**POST** `/api/v1/courses/enroll`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "courseId": "60d0fe4f5311236168a109cb"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Successfully enrolled in course",
  "data": {
    "enrollment": {
      "id": "60d0fe4f5311236168a109d0",
      "userId": "60d0fe4f5311236168a109ca",
      "courseId": "60d0fe4f5311236168a109cb",
      "enrollmentDate": "2021-06-21T15:30:00.000Z",
      "progress": 0,
      "status": "active"
    },
    "course": {
      "title": "Complete React Development",
      "duration": "8 weeks"
    }
  }
}
```

### 4. Create Course (Admin/Tutor)
**POST** `/api/v1/courses`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
title: Complete React Development
description: Learn React from basics to advanced concepts
shortDescription: Master React with hands-on projects
category: Web Development
level: Intermediate
duration: 8 weeks
price: 99900
originalPrice: 149900
prerequisites: ["HTML", "CSS", "JavaScript"]
learningOutcomes: ["Build React apps", "Learn Hooks"]
tags: ["React", "JavaScript"]
image: <image_file>
thumbnail: <image_file>
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "course": {
      "id": "60d0fe4f5311236168a109cb",
      "title": "Complete React Development",
      "description": "Learn React from basics to advanced concepts",
      "price": 99900,
      "image": "https://cloudinary.com/course-image.jpg",
      "thumbnail": "https://cloudinary.com/course-thumb.jpg",
      "instructor": "60d0fe4f5311236168a109cc",
      "isPublished": false,
      "createdAt": "2021-06-21T15:30:00.000Z"
    }
  }
}
```

---

## Progress Tracking Endpoints

### 1. Get Course Progress
**GET** `/api/v1/progress/course/:courseId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Course progress retrieved successfully",
  "data": {
    "courseId": "60d0fe4f5311236168a109cb",
    "courseTitle": "Complete React Development",
    "overallProgress": 65.5,
    "totalModules": 4,
    "completedModules": 2,
    "totalLessons": 32,
    "completedLessons": 21,
    "timeSpent": 1800, // in seconds
    "lastAccessed": "2021-06-21T15:30:00.000Z",
    "modules": [
      {
        "moduleId": "60d0fe4f5311236168a109cd",
        "moduleTitle": "React Fundamentals",
        "moduleProgress": 100,
        "totalLessons": 8,
        "completedLessons": 8,
        "lessons": [
          {
            "lessonId": "60d0fe4f5311236168a109ce",
            "lessonTitle": "Introduction to React",
            "isCompleted": true,
            "completedAt": "2021-06-21T15:30:00.000Z",
            "watchTime": 1800,
            "duration": 1800
          }
        ]
      }
    ],
    "nextLesson": {
      "lessonId": "60d0fe4f5311236168a109cf",
      "lessonTitle": "React Hooks Deep Dive",
      "moduleTitle": "Advanced React Concepts"
    }
  }
}
```

### 2. Mark Lesson as Complete
**PUT** `/api/v1/progress/complete-lesson`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "courseId": "60d0fe4f5311236168a109cb",
  "lessonId": "60d0fe4f5311236168a109ce",
  "watchTime": 1800
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Lesson marked as complete",
  "data": {
    "lessonProgress": {
      "lessonId": "60d0fe4f5311236168a109ce",
      "isCompleted": true,
      "completedAt": "2021-06-21T15:30:00.000Z",
      "watchTime": 1800
    },
    "courseProgress": {
      "overallProgress": 68.2,
      "completedLessons": 22,
      "totalLessons": 32
    },
    "nextLesson": {
      "lessonId": "60d0fe4f5311236168a109cf",
      "lessonTitle": "React Hooks Deep Dive"
    }
  }
}
```

### 3. Sync Progress
**PUT** `/api/v1/progress/sync`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "courseId": "60d0fe4f5311236168a109cb",
  "lessonId": "60d0fe4f5311236168a109ce",
  "watchTime": 900,
  "totalDuration": 1800,
  "lastPosition": 900
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Progress synced successfully",
  "data": {
    "watchTime": 900,
    "lastPosition": 900,
    "progressPercentage": 50,
    "updatedAt": "2021-06-21T15:30:00.000Z"
  }
}
```

---

## Live Classes Endpoints

### 1. Get Live Classes
**GET** `/api/v1/live-classes`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `status` (optional): upcoming, live, completed
- `courseId` (optional): Filter by course

**Response (200):**
```json
{
  "status": "success",
  "message": "Live classes retrieved successfully",
  "data": {
    "liveClasses": [
      {
        "id": "60d0fe4f5311236168a109d1",
        "title": "React Hooks Workshop",
        "description": "Deep dive into React Hooks",
        "courseId": "60d0fe4f5311236168a109cb",
        "courseTitle": "Complete React Development",
        "instructor": {
          "id": "60d0fe4f5311236168a109cc",
          "firstName": "Jane",
          "lastName": "Smith",
          "profilePic": "https://cloudinary.com/instructor.jpg"
        },
        "scheduledTime": "2021-06-25T14:00:00.000Z",
        "duration": 120, // in minutes
        "maxParticipants": 50,
        "currentParticipants": 35,
        "meetingUrl": "https://meet.jit.si/react-hooks-workshop-123",
        "status": "upcoming",
        "isRecorded": true,
        "recordingUrl": null,
        "materials": [
          {
            "title": "Workshop Slides",
            "url": "https://cloudinary.com/slides.pdf",
            "type": "pdf"
          }
        ],
        "createdAt": "2021-06-21T15:30:00.000Z"
      }
    ]
  }
}
```

### 2. Join Live Class
**POST** `/api/v1/live-classes/:classId/join`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Successfully joined live class",
  "data": {
    "meetingUrl": "https://meet.jit.si/react-hooks-workshop-123",
    "participantInfo": {
      "userId": "60d0fe4f5311236168a109ca",
      "displayName": "John Doe",
      "joinedAt": "2021-06-25T14:05:00.000Z"
    },
    "classDetails": {
      "title": "React Hooks Workshop",
      "instructor": "Jane Smith",
      "duration": 120
    }
  }
}
```

### 3. Create Live Class (Admin/Tutor)
**POST** `/api/v1/live-classes`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "title": "React Hooks Workshop",
  "description": "Deep dive into React Hooks",
  "courseId": "60d0fe4f5311236168a109cb",
  "scheduledTime": "2021-06-25T14:00:00.000Z",
  "duration": 120,
  "maxParticipants": 50,
  "isRecorded": true
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Live class created successfully",
  "data": {
    "liveClass": {
      "id": "60d0fe4f5311236168a109d1",
      "title": "React Hooks Workshop",
      "meetingUrl": "https://meet.jit.si/react-hooks-workshop-123",
      "scheduledTime": "2021-06-25T14:00:00.000Z",
      "status": "scheduled",
      "createdAt": "2021-06-21T15:30:00.000Z"
    }
  }
}
```

---

## Payment Endpoints

### 1. Initialize Payment
**POST** `/api/v1/payments/initialize`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "courseId": "60d0fe4f5311236168a109cb",
  "paymentType": "course", // or "subscription"
  "amount": 99900,
  "currency": "NGN"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Payment initialized successfully",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/abc123",
    "accessCode": "abc123def456",
    "reference": "TJ_pay_xyz789abc123",
    "amount": 99900,
    "currency": "NGN",
    "paymentDetails": {
      "courseId": "60d0fe4f5311236168a109cb",
      "courseTitle": "Complete React Development",
      "paymentType": "course"
    }
  }
}
```

### 2. Verify Payment
**GET** `/api/v1/payments/verify/:reference`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "reference": "TJ_pay_xyz789abc123",
      "amount": 99900,
      "currency": "NGN",
      "status": "success",
      "paidAt": "2021-06-21T15:30:00.000Z",
      "channel": "card",
      "gatewayResponse": "Successful"
    },
    "course": {
      "id": "60d0fe4f5311236168a109cb",
      "title": "Complete React Development"
    },
    "enrollment": {
      "id": "60d0fe4f5311236168a109d0",
      "enrollmentDate": "2021-06-21T15:30:00.000Z",
      "status": "active"
    }
  }
}
```

### 3. Get User's Purchased Courses
**GET** `/api/v1/payments/my-courses`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Purchased courses retrieved successfully",
  "data": {
    "courses": [
      {
        "courseId": "60d0fe4f5311236168a109cb",
        "title": "Complete React Development",
        "thumbnail": "https://cloudinary.com/course-thumb.jpg",
        "purchaseDate": "2021-06-21T15:30:00.000Z",
        "amount": 99900,
        "progress": 65.5,
        "status": "active",
        "lastAccessed": "2021-06-23T10:15:00.000Z"
      }
    ],
    "totalCourses": 3,
    "totalSpent": 299700
  }
}
```

### 4. Get Payment Summary
**GET** `/api/v1/payments/summary`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Payment summary retrieved successfully",
  "data": {
    "totalPayments": 5,
    "totalAmount": 499500,
    "successfulPayments": 4,
    "failedPayments": 1,
    "lastPayment": {
      "reference": "TJ_pay_xyz789abc123",
      "amount": 99900,
      "status": "success",
      "date": "2021-06-21T15:30:00.000Z"
    },
    "paymentMethods": [
      {
        "method": "card",
        "count": 3,
        "totalAmount": 299700
      }
    ]
  }
}
```

---

## Subscription Endpoints

### 1. Get Subscription Plans (Public)
**GET** `/api/v1/subscriptions/plans`

**Response (200):**
```json
{
  "status": "success",
  "message": "Subscription plans retrieved successfully",
  "data": {
    "plans": {
      "bronze": {
        "id": "60d0fe4f5311236168a109d2",
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
        "id": "60d0fe4f5311236168a109d3",
        "name": "Silver Plan",
        "price": 3000000,
        "currency": "NGN",
        "billing": "monthly",
        "description": "Monthly subscription with mentorship and AI tutor",
        "features": [
          {
            "feature": "All Bronze Plan features",
            "duration": "monthly",
            "included": true,
            "limit": null
          },
          {
            "feature": "Live classes and workshops",
            "duration": "monthly",
            "included": true,
            "limit": "unlimited"
          },
          {
            "feature": "1-on-1 mentorship sessions",
            "duration": "monthly",
            "included": true,
            "limit": "2 sessions"
          }
        ],
        "metadata": {
          "popular": true,
          "recommended": false,
          "lifetimeAccess": false
        },
        "formattedPrice": "₦30,000/month"
      }
    }
  }
}
```

### 2. Initialize Subscription
**POST** `/api/v1/subscriptions/initialize`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "planId": "60d0fe4f5311236168a109d2",
  "planType": "bronze"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Subscription payment initialized successfully",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/sub123",
    "accessCode": "sub123def456",
    "reference": "TJ_sub_xyz789abc123",
    "subscriptionDetails": {
      "planId": "60d0fe4f5311236168a109d2",
      "planName": "Bronze Plan",
      "amount": 1580000,
      "billing": "one-time"
    }
  }
}
```

### 3. Get User Subscriptions
**GET** `/api/v1/subscriptions/my-subscriptions`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "User subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "id": "60d0fe4f5311236168a109d4",
        "planId": "60d0fe4f5311236168a109d2",
        "planName": "Bronze Plan",
        "status": "active",
        "startDate": "2021-06-21T15:30:00.000Z",
        "endDate": null, // null for lifetime plans
        "nextBillingDate": null,
        "amount": 1580000,
        "currency": "NGN",
        "billing": "one-time",
        "features": [
          "Lifetime course access",
          "AI Tutor (1 month)",
          "Certificate"
        ],
        "paymentReference": "TJ_sub_xyz789abc123"
      }
    ],
    "activeSubscription": {
      "planName": "Bronze Plan",
      "status": "active",
      "expiresAt": null,
      "features": ["Lifetime access", "AI Tutor", "Certificate"]
    }
  }
}
```

### 4. Get Subscription Status
**GET** `/api/v1/subscriptions/status`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Subscription status retrieved successfully",
  "data": {
    "hasActiveSubscription": true,
    "currentPlan": {
      "id": "60d0fe4f5311236168a109d2",
      "name": "Bronze Plan",
      "status": "active",
      "expiresAt": null,
      "features": {
        "courseAccess": "lifetime",
        "aiTutor": "1-month",
        "liveClasses": false,
        "mentorship": false,
        "certificate": true
      }
    },
    "accessPermissions": {
      "canAccessCourses": true,
      "canUseAiTutor": true,
      "canJoinLiveClasses": false,
      "canBookMentorship": false
    }
  }
}
```

---

## AI Tutor Endpoints

### 1. Ask AI Tutor
**POST** `/api/v1/ai-tutor/ask`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "question": "What are React Hooks and how do they work?",
  "courseId": "60d0fe4f5311236168a109cb",
  "context": "lesson" // optional: lesson, general, assignment
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "AI Tutor response generated successfully",
  "data": {
    "question": "What are React Hooks and how do they work?",
    "answer": "React Hooks are functions that let you use state and other React features in functional components. They were introduced in React 16.8 as a way to write components without classes...",
    "courseContext": {
      "courseId": "60d0fe4f5311236168a109cb",
      "courseTitle": "Complete React Development"
    },
    "relatedTopics": [
      "useState Hook",
      "useEffect Hook",
      "Custom Hooks",
      "Hook Rules"
    ],
    "suggestedFollowUps": [
      "How do I create custom hooks?",
      "What are the rules of hooks?",
      "When should I use useEffect?"
    ],
    "timestamp": "2021-06-21T15:30:00.000Z"
  }
}
```

### 2. Get AI Tutor Chat History
**GET** `/api/v1/ai-tutor/history`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` (optional): Number of history items (default: 50, max: 100)
- `page` (optional): Page number (default: 1)
- `courseId` (optional): Filter by specific course
- `type` (optional): Filter by interaction type (explanation, study-plan, question, exercises)

**Response (200):**
```json
{
  "status": "success",
  "message": "AI Tutor history retrieved successfully",
  "data": {
    "history": [
      {
        "_id": "60d0fe4f5311236168a109d5",
        "interactionType": "explanation",
        "topic": "React Hooks",
        "userInput": "Topic: React Hooks, Questions: How do useState and useEffect work together?",
        "userLevel": "intermediate",
        "courseId": {
          "_id": "60d0fe4f5311236168a109cb",
          "title": "Complete React Development",
          "thumbnail": "https://cloudinary.com/course-thumb.jpg"
        },
        "metadata": {
          "model": "llama3-8b-8192",
          "tokensUsed": 456,
          "responseTime": 2340
        },
        "tags": ["React Hooks", "intermediate"],
        "createdAt": "2021-06-21T15:30:00.000Z",
        "formattedDate": "6/21/2021"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "hasNext": true,
      "hasPrev": false,
      "limit": 50
    },
    "statistics": {
      "totalInteractions": 25,
      "interactionTypes": {
        "explanation": 10,
        "question": 8,
        "study-plan": 4,
        "exercises": 3
      },
      "courseSummary": [
        {
          "courseId": "60d0fe4f5311236168a109cb",
          "courseTitle": "Complete React Development",
          "thumbnail": "https://cloudinary.com/course-thumb.jpg",
          "interactionCount": 15,
          "lastInteraction": "2021-06-21T15:30:00.000Z"
        }
      ]
    }
  }
}
```

### 3. Get Detailed History Item
**GET** `/api/v1/ai-tutor/history/:historyId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "AI Tutor history item retrieved successfully",
  "data": {
    "_id": "60d0fe4f5311236168a109d5",
    "interactionType": "explanation",
    "topic": "React Hooks",
    "userInput": "Topic: React Hooks, Questions: How do useState and useEffect work together?",
    "aiResponse": "React Hooks are functions that let you use state and other React features in functional components. The useState hook allows you to add state to functional components, while useEffect lets you perform side effects...",
    "userLevel": "intermediate",
    "courseId": {
      "_id": "60d0fe4f5311236168a109cb",
      "title": "Complete React Development",
      "thumbnail": "https://cloudinary.com/course-thumb.jpg"
    },
    "metadata": {
      "model": "llama3-8b-8192",
      "tokensUsed": 456,
      "responseTime": 2340,
      "sessionId": "session_abc123"
    },
    "tags": ["React Hooks", "intermediate"],
    "rating": null,
    "feedback": null,
    "createdAt": "2021-06-21T15:30:00.000Z",
    "updatedAt": "2021-06-21T15:30:00.000Z"
  }
}
```

---

## Assessment Endpoints

### 1. Get Course Assessments
**GET** `/api/v1/assessments/course/:courseId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Course assessments retrieved successfully",
  "data": {
    "assessments": [
      {
        "id": "60d0fe4f5311236168a109d6",
        "title": "React Fundamentals Quiz",
        "description": "Test your knowledge of React basics",
        "moduleId": "60d0fe4f5311236168a109cd",
        "moduleTitle": "React Fundamentals",
        "type": "quiz", // quiz, assignment, project
        "duration": 30, // minutes
        "totalQuestions": 15,
        "passingScore": 70,
        "maxAttempts": 3,
        "attemptsUsed": 1,
        "bestScore": 85,
        "lastAttemptDate": "2021-06-21T15:30:00.000Z",
        "status": "completed", // not_started, in_progress, completed
        "isRequired": true,
        "availableFrom": "2021-06-21T00:00:00.000Z",
        "availableUntil": "2021-12-31T23:59:59.000Z"
      }
    ]
  }
}
```

### 2. Start Assessment
**POST** `/api/v1/assessments/:assessmentId/start`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Assessment started successfully",
  "data": {
    "attemptId": "60d0fe4f5311236168a109d7",
    "assessment": {
      "id": "60d0fe4f5311236168a109d6",
      "title": "React Fundamentals Quiz",
      "duration": 30,
      "totalQuestions": 15
    },
    "questions": [
      {
        "id": "60d0fe4f5311236168a109d8",
        "questionNumber": 1,
        "question": "What is React?",
        "type": "multiple-choice",
        "options": [
          { "id": "a", "text": "A JavaScript library" },
          { "id": "b", "text": "A database" },
          { "id": "c", "text": "A programming language" },
          { "id": "d", "text": "An operating system" }
        ],
        "points": 5
      }
    ],
    "startTime": "2021-06-21T15:30:00.000Z",
    "endTime": "2021-06-21T16:00:00.000Z",
    "timeRemaining": 1800 // seconds
  }
}
```

### 3. Submit Assessment
**POST** `/api/v1/assessments/:assessmentId/submit`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "attemptId": "60d0fe4f5311236168a109d7",
  "answers": [
    {
      "questionId": "60d0fe4f5311236168a109d8",
      "selectedOption": "a"
    }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Assessment submitted successfully",
  "data": {
    "result": {
      "attemptId": "60d0fe4f5311236168a109d7",
      "score": 85,
      "percentage": 85,
      "totalQuestions": 15,
      "correctAnswers": 13,
      "incorrectAnswers": 2,
      "timeTaken": 1200, // seconds
      "passed": true,
      "grade": "B+",
      "submittedAt": "2021-06-21T15:50:00.000Z"
    },
    "feedback": [
      {
        "questionId": "60d0fe4f5311236168a109d8",
        "isCorrect": true,
        "selectedOption": "a",
        "correctOption": "a",
        "explanation": "React is indeed a JavaScript library for building user interfaces."
      }
    ],
    "certificate": {
      "eligible": true,
      "certificateId": "60d0fe4f5311236168a109d9",
      "downloadUrl": "https://cloudinary.com/certificate.pdf"
    }
  }
}
```

---

## Booking Endpoints

### 1. Create Booking
**POST** `/api/v1/bookings`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "tutorId": "60d0fe4f5311236168a109cc",
  "sessionType": "mentorship", // mentorship, consultation, code-review
  "preferredDate": "2021-06-25T14:00:00.000Z",
  "duration": 60, // minutes
  "topic": "React Hooks Implementation",
  "description": "Need help with custom hooks implementation",
  "contactPreference": "video-call" // video-call, audio-call, chat
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": "60d0fe4f5311236168a109da",
      "tutorId": "60d0fe4f5311236168a109cc",
      "studentId": "60d0fe4f5311236168a109ca",
      "sessionType": "mentorship",
      "preferredDate": "2021-06-25T14:00:00.000Z",
      "confirmedDate": null,
      "duration": 60,
      "topic": "React Hooks Implementation",
      "status": "pending", // pending, confirmed, completed, cancelled
      "meetingUrl": null,
      "createdAt": "2021-06-21T15:30:00.000Z"
    },
    "tutor": {
      "firstName": "Jane",
      "lastName": "Smith",
      "profilePic": "https://cloudinary.com/instructor.jpg"
    }
  }
}
```

### 2. Get User Bookings
**GET** `/api/v1/bookings/my-bookings`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `status` (optional): pending, confirmed, completed, cancelled
- `upcoming` (optional): true/false

**Response (200):**
```json
{
  "status": "success",
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "60d0fe4f5311236168a109da",
        "tutor": {
          "id": "60d0fe4f5311236168a109cc",
          "firstName": "Jane",
          "lastName": "Smith",
          "profilePic": "https://cloudinary.com/instructor.jpg",
          "expertise": ["React", "JavaScript", "Node.js"]
        },
        "sessionType": "mentorship",
        "topic": "React Hooks Implementation",
        "preferredDate": "2021-06-25T14:00:00.000Z",
        "confirmedDate": "2021-06-25T14:00:00.000Z",
        "duration": 60,
        "status": "confirmed",
        "meetingUrl": "https://meet.jit.si/mentorship-session-123",
        "canJoin": true,
        "canCancel": true,
        "createdAt": "2021-06-21T15:30:00.000Z"
      }
    ],
    "upcomingBookings": 2,
    "completedBookings": 5
  }
}
```

---

## Webhook Endpoints

### 1. Paystack Webhook
**POST** `/api/v1/webhooks/paystack`

**Headers:**
```
x-paystack-signature: <webhook_signature>
```

**Request Body:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "TJ_pay_xyz789abc123",
    "amount": 99900,
    "currency": "NGN",
    "status": "success",
    "customer": {
      "email": "john.doe@example.com"
    },
    "metadata": {
      "courseId": "60d0fe4f5311236168a109cb",
      "userId": "60d0fe4f5311236168a109ca",
      "paymentType": "course"
    }
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Access denied. Insufficient permissions."
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Course not found"
}
```

### 429 Too Many Requests
```json
{
  "status": "error",
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "error": "Something went wrong on our end"
}
```

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Tokens expire after 24 hours and need to be refreshed by logging in again.

---

## Rate Limiting

API endpoints have rate limiting applied:
- Authentication endpoints: 25 requests per 15 minutes
- OTP endpoints: 3 requests per minute  
- General endpoints: 5 requests per 10 seconds per user token
- Course endpoints: 50 requests per 15 minutes
- Admin endpoints: 20 requests per 15 minutes

---

## Pagination

List endpoints support pagination with query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Pagination response format:
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "hasNext": true,
    "hasPrev": false,
    "limit": 10
  }
}
```

---

## File Uploads

File upload endpoints accept multipart/form-data:
- Profile pictures: Max 5MB, formats: jpg, jpeg, png, gif
- Course images: Max 10MB, formats: jpg, jpeg, png
- Course brochures: Max 20MB, formats: pdf, doc, docx

All uploaded files are stored on Cloudinary and return secure URLs.
