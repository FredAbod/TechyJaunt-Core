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

---

## 📋 **Complete API Endpoints**

### **🔐 Authentication Endpoints**
```
POST   /api/v1/auth/register          # Email registration + send OTP
POST   /api/v1/auth/verify-otp        # Verify email OTP
POST   /api/v1/auth/resend-otp        # Resend OTP
POST   /api/v1/auth/set-password      # Set password after verification
POST   /api/v1/auth/login             # User login
```

### **👤 User Profile Endpoints**
```
POST   /api/v1/user/profile           # Complete profile setup
GET    /api/v1/user/profile           # Get user profile
PUT    /api/v1/user/profile           # Update profile
GET    /api/v1/user/dashboard         # User dashboard with progress
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

### **Booking & Availability**
- `Booking` - Session bookings and availability
- `TutorAvailability` - Tutor's available time slots
- `SessionFeedback` - Feedback for completed sessions

---

## 🎯 **Completed: Full LMS Backend System**

All phases have been successfully implemented:
- ✅ Authentication & User Management
- ✅ Course Management System
- ✅ Live Classes with Video Conferencing
- ✅ Pre-recorded Content & File Upload
- ✅ Booking & Availability System

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

---

## 🚀 **Complete & Ready to Use!**

Your TechyJaunt Learning Management System is now fully functional with:
- Complete user authentication flow with OTP verification
- Course management with progress tracking
- Live classes with video conferencing
- Pre-recorded content with file upload
- Tutor availability and session booking system
- Professional email notifications
- Comprehensive API documentation
- Rate limiting and security measures

The system is ready for frontend integration and production deployment!
