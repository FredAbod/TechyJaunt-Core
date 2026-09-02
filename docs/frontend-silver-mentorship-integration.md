# Frontend Integration Guide: Silver Plan & Mentorship Access

**Date:** September 2026  
**Audience:** Frontend developers  
**Backend status:** Ready to deploy

---

## Summary

We fixed a backend issue where **Silver plan users paid successfully but could not see mentorship** on the dashboard.

**Root cause:** The dashboard only listed courses that had a **progress record** (Bronze/Gold with video access). Silver plans do **not** create progress records because they include mentorship + AI tutor only — not course videos.

**Fix:** The backend now returns Silver subscriptions on the dashboard and exposes clearer subscription/feature flags. The frontend must use these flags instead of assuming `enrolledCourses` = video access.

---

## Plan access matrix

| Feature | Bronze | Silver | Gold |
|--------|--------|--------|------|
| Course videos | Yes (lifetime) | **No** | Yes (lifetime) |
| Mentorship (1-on-1 sessions) | No | **Yes** (billing period) | Yes (billing period) |
| AI Tutor | Yes (1 month) | **Yes** (billing period) | Yes (billing period) |
| Certificate | Yes | No | Yes |
| Premium resources | Yes | No | Yes |
| Alumni / LinkedIn / Networking | Yes | Yes (billing period) | Yes |

---

## Breaking change notice (dashboard)

This is a **soft breaking change**:

- **JSON shape:** Mostly backward compatible for Bronze/Gold users (new fields added, old fields kept).
- **Semantics changed:** `enrolledCourses` and `stats.totalCourses` no longer mean “courses with videos only”.

### Before

- `enrolledCourses` = only Bronze/Gold users with progress
- Silver users often saw **0 courses** after paying
- `stats.totalCourses` = video-enrolled courses only

### After

- `enrolledCourses` = video courses **+** mentorship-only courses (Silver)
- Silver users see their subscribed course with `accessType: "mentorship-only"`
- `stats.totalCourses` = all enrollments (video + mentorship-only)

### Safe frontend rules

```ts
const canWatchVideos =
  course.subscription?.hasCourseContent === true ||
  course.subscription?.accessType === "full" ||
  course.subscription?.featureAccess?.courseAccess === true;

const canBookMentorship =
  course.subscription?.mentorshipDetails?.hasAccess === true ||
  course.subscription?.featureAccess?.mentorship === true;

const canUseAiTutor =
  course.subscription?.featureAccess?.aiTutor === true;
```

| UI action | Gate with |
|-----------|-----------|
| Watch videos / open modules | `canWatchVideos` |
| Show progress bar | `canWatchVideos` && `progress.totalModules > 0` |
| Book 1-on-1 session | `canBookMentorship` |
| Open AI Tutor | `canUseAiTutor` |
| “My courses” count (videos only) | `stats.coursesWithContent` |
| “My subscriptions” count (all) | `stats.totalCourses` |

---

## API changes

### 1. Dashboard

**`GET /api/v1/user/dashboard`**  
Auth: Bearer token required

#### New / updated `stats` fields

```json
{
  "stats": {
    "totalCourses": 1,
    "coursesWithContent": 0,
    "mentorshipOnlyCourses": 1,
    "completedCourses": 0,
    "inProgressCourses": 0,
    "overallProgress": 0,
    "totalWatchTime": 0,
    "learningStreak": { ... }
  }
}
```

| Field | Meaning |
|-------|---------|
| `totalCourses` | All enrollments (video + mentorship-only) |
| `coursesWithContent` | Courses where user can watch videos |
| `mentorshipOnlyCourses` | Silver-style subscriptions without video access |

#### Updated `enrolledCourses[]` item

```json
{
  "courseId": "697ddd62a6d522fd55b99ee1",
  "title": "Backend web development",
  "description": "...",
  "thumbnail": "...",
  "category": "Web Development",
  "level": "Beginner",
  "instructor": {
    "name": "Jane Doe",
    "id": "..."
  },
  "duration": 40,
  "price": 50000,
  "subscription": {
    "id": "6a94ec940616af6221ddbb1a",
    "plan": "silver",
    "status": "active",
    "billingActive": true,
    "endDate": "2026-10-01T02:53:08.012Z",
    "startDate": "2026-08-31T02:53:08.012Z",
    "createdAt": "2026-08-31T02:53:08.392Z",
    "hasCourseContent": false,
    "accessType": "mentorship-only",
    "featureAccess": {
      "aiTutor": true,
      "mentorship": true,
      "courseAccess": false,
      "premiumResources": false,
      "certificate": false,
      "alumniCommunity": true,
      "linkedinOptimization": true,
      "networking": true
    },
    "mentorshipDetails": {
      "hasAccess": true,
      "sessionsUsed": 0,
      "sessionsLimit": 5,
      "expiresAt": "2026-10-01T02:53:08.012Z"
    }
  },
  "progress": {
    "overallProgress": 0,
    "currentModuleIndex": 0,
    "totalModules": 0,
    "isCompleted": false,
    "completedAt": null,
    "lastActivityAt": null,
    "totalWatchTime": 0
  }
}
```

#### `subscription.accessType` values

| Value | Meaning |
|-------|---------|
| `"full"` | Bronze or Gold — includes course videos |
| `"mentorship-only"` | Silver — mentorship + AI tutor, no videos |

#### Recommended dashboard UI

**Silver (`mentorship-only`):**
- Show course card with badge: **“Mentorship Plan”**
- Show: **Book Session**, **AI Tutor**
- Hide or disable: **Watch Course**, module list, progress bar
- Show sessions remaining: `sessionsLimit - sessionsUsed`

**Bronze/Gold (`full`):**
- Existing behavior unchanged
- Optionally also show mentorship if `featureAccess.mentorship === true` (Gold)

---

### 2. Course-level subscription status (NEW)

**`GET /api/v1/subscriptions/course/:courseId/status`**  
Auth: Bearer token required

Use on **course detail pages** to decide which features to show.

#### Example response (Silver user)

```json
{
  "message": "Course subscription status retrieved successfully",
  "hasSubscription": true,
  "hasCourseEntitlement": false,
  "hasActiveBilling": true,
  "plan": "silver",
  "featureAccess": {
    "courseAccess": false,
    "certificate": false,
    "premiumResources": false,
    "linkedinOptimization": true,
    "alumniCommunity": true,
    "networking": true,
    "aiTutor": true,
    "mentorship": true
  },
  "mentorshipDetails": {
    "sessionsUsed": 0,
    "sessionsLimit": 5,
    "hasAccess": true,
    "expiresAt": "2026-10-01T02:53:08.012Z"
  },
  "subscription": {
    "id": "6a94ec940616af6221ddbb1a",
    "plan": "silver",
    "status": "active",
    "course": {
      "_id": "697ddd62a6d522fd55b99ee1",
      "title": "Backend web development",
      "category": "Web Development",
      "level": "Beginner"
    },
    "startDate": "2026-08-31T02:53:08.012Z",
    "endDate": "2026-10-01T02:53:08.012Z",
    "isRecurring": true,
    "billingActive": true,
    "billingEndDate": "2026-10-01T02:53:08.012Z"
  }
}
```

#### Key fields

| Field | Use for |
|-------|---------|
| `hasCourseEntitlement` | Can user watch videos? |
| `hasActiveBilling` | Is billing period still active? |
| `featureAccess.mentorship` | Show book session button? |
| `featureAccess.aiTutor` | Show AI tutor? |
| `mentorshipDetails` | Session count UI |

---

### 3. Global subscription status (UPDATED)

**`GET /api/v1/subscriptions/status`**  
Auth: Bearer token required

Now includes:
- `mentorshipDetails` (aggregated)
- `subscriptions[]` with `accessType`, `hasCourseContent`, `featureAccess`, `mentorshipDetails` per subscription

```json
{
  "hasActiveSubscription": true,
  "hasCourseEntitlement": false,
  "activePlans": ["silver"],
  "totalActiveSubscriptions": 1,
  "featureAccess": {
    "aiTutor": true,
    "mentorship": true,
    "courseAccess": false,
    "premiumResources": false,
    "certificate": false,
    "alumniCommunity": true,
    "linkedinOptimization": true,
    "networking": true
  },
  "mentorshipDetails": {
    "hasAccess": true,
    "sessionsUsed": 0,
    "sessionsLimit": 5,
    "expiresAt": "2026-10-01T02:53:08.012Z"
  },
  "subscriptions": [
    {
      "id": "...",
      "plan": "silver",
      "hasCourseContent": false,
      "accessType": "mentorship-only",
      "featureAccess": { ... },
      "mentorshipDetails": { ... },
      "course": { "id": "...", "title": "Backend web development", ... }
    }
  ]
}
```

---

### 4. User subscriptions list (UPDATED)

**`GET /api/v1/subscriptions/my-subscriptions`**  
Auth: Bearer token required

Each subscription now includes:
- `hasCourseContent`
- `accessType`
- `featureAccess` (computed booleans)
- `mentorshipDetails`
- `billingActive`

---

### 5. Verify after payment (UPDATED — important)

**`GET /api/v1/subscriptions/verify/:reference`**  
Auth: Bearer token required

**Always call this on the payment confirmation page** before redirecting to the dashboard.

Bank transfers can take 30+ seconds; the webhook may arrive after the user lands on the confirmation page. Verify acts as a backup to activate the subscription immediately.

```json
{
  "message": "Subscription verified successfully",
  "subscription": {
    "id": "...",
    "plan": "silver",
    "status": "active",
    "billingActive": true,
    "hasCourseContent": false,
    "accessType": "mentorship-only",
    "featureAccess": {
      "mentorship": true,
      "aiTutor": true,
      "courseAccess": false
    },
    "mentorshipDetails": {
      "hasAccess": true,
      "sessionsUsed": 0,
      "sessionsLimit": 5,
      "expiresAt": "..."
    },
    "courseId": "697ddd62a6d522fd55b99ee1",
    "user": "..."
  }
}
```

#### Recommended confirmation page flow

```
1. User returns from Paystack with ?reference=TJ_SUB_xxx
2. Show loading: "Confirming your payment..."
3. GET /api/v1/subscriptions/verify/:reference
4. On success:
   - If accessType === "mentorship-only" → redirect to dashboard or booking page
   - If accessType === "full" → redirect to course player / dashboard
5. On failure → show retry + support message
```

---

### 6. Book mentorship session (unchanged)

**`POST /api/v1/bookings/sessions`**  
Auth: Bearer token required

Body must include `courseId`. Backend validates mentorship access server-side.

```json
{
  "courseId": "697ddd62a6d522fd55b99ee1",
  "tutorId": "...",
  "date": "2026-09-10",
  "startTime": "10:00",
  "endTime": "11:00"
}
```

If user lacks mentorship access, API returns **403** with a reason string.

---

## Frontend checklist

### Required before / with backend deploy

- [ ] **Payment confirmation:** Call `GET /api/v1/subscriptions/verify/:reference` on success redirect
- [ ] **Dashboard:** Do not assume every `enrolledCourses` item has videos
- [ ] **Dashboard:** Use `subscription.accessType` or `hasCourseContent` before showing video UI
- [ ] **Dashboard:** Use `stats.coursesWithContent` for “my video courses” count
- [ ] **Course page:** Use `GET /api/v1/subscriptions/course/:courseId/status` for feature gating
- [ ] **Mentorship button:** Gate on `featureAccess.mentorship` or `mentorshipDetails.hasAccess`
- [ ] **Silver card UI:** Show “Mentorship Plan” badge; hide video/progress for `mentorship-only`

### Do NOT use these for Silver mentorship access

- Progress record existence
- `progress.totalModules > 0`
- `featureAccess.courseAccess`
- `hasCourseEntitlement` alone (Silver has `false` but still has mentorship)

---

## Example UI states

### Silver user on dashboard

```
┌─────────────────────────────────────────┐
│ Backend Web Development                 │
│ [Mentorship Plan]                       │
│                                         │
│ Sessions: 0 / 5 used                    │
│ Valid until: Oct 1, 2026                │
│                                         │
│ [Book Session]  [AI Tutor]              │
│ (no Watch Course button)                │
└─────────────────────────────────────────┘
```

### Bronze/Gold user on dashboard

```
┌─────────────────────────────────────────┐
│ Data Analysis                           │
│ [Gold Plan]                             │
│                                         │
│ Progress: 42%                           │
│                                         │
│ [Continue Learning]  [Book Session]*    │
└─────────────────────────────────────────┘
* Gold only
```

---

## Test accounts / scenarios

| Scenario | Expected `accessType` | Videos | Mentorship |
|----------|----------------------|--------|------------|
| Bronze subscriber | `full` | Yes | No |
| Silver subscriber | `mentorship-only` | No | Yes |
| Gold subscriber | `full` | Yes | Yes |
| Expired Silver | N/A (billing inactive) | No | No |

---

## Questions?

If anything is unclear or you need additional fields in the API response, reach out before shipping the frontend changes.

**Related backend files:**
- `src/resources/courses/services/course.service.js` — dashboard logic
- `src/resources/payments/services/subscription.service.js` — subscription status & feature access
- `src/resources/payments/routes/subscription.routes.js` — subscription routes
