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
- Live class scheduling and management
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
- ✅ Payment System Integration

---

## 💡 **Key Technologies Used**

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT tokens, bcrypt hashing
- **Validation**: Joi schema validation
- **File Storage**: Cloudinary (videos, images, documents)
- **Email**: Nodemailer with HTML templates
- **Video Conferencing**: Jitsi Meet (free, no API keys)
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
    }
  }
}
```

### **Frontend Integration:**
```javascript
// Example usage in your frontend
const loginResponse = await loginUser(email, password);
const { user, token, paymentStatus } = loginResponse.data;

// Check if user has paid for courses
if (paymentStatus.hasPaidCourses) {
  // User has paid courses - show premium content
  console.log(`User has paid for ${paymentStatus.totalPaidCourses} courses`);
  console.log(`Total amount paid: ₦${paymentStatus.totalAmountPaid / 100}`);
} else {
  // User hasn't paid for any courses - show free content only
  console.log('User has not purchased any courses yet');
}

// Check if user has paid for a specific course
const courseId = "68561f125f6bb4ec70d664c9";
const hasPaidForCourse = paymentStatus.paidCourseIds.includes(courseId);
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
