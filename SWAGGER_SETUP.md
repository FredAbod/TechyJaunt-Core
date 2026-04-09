# Auto-Generated API Documentation with Swagger

## ✅ Setup Complete (5 Minutes)

Your API now has auto-generated documentation at:
- **Local**: `http://localhost:5000/api-docs`
- **Production**: `https://techyjaunt-core-tvr6.onrender.com/api-docs`

## What Was Installed

```bash
npm install swagger-ui-express swagger-jsdoc
```

## Files Created/Modified

1. **swagger.js** (NEW) - Configuration that scans your routes for JSDoc comments
2. **app.js** (MODIFIED) - Added `/api-docs` endpoint
3. **src/resources/auth/routes/auth.routes.js** (MODIFIED) - Added JSDoc comments to all routes

## How to Add Docs to Other Routes

Simply add JSDoc comments BEFORE each route. Example:

```javascript
/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     tags:
 *       - User
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get("/profile", isAuthenticated, getProfile);
```

## Quick Template (Copy & Paste)

```javascript
/**
 * @swagger
 * /api/v1/resource/endpoint:
 *   post:
 *     tags:
 *       - ResourceName
 *     summary: Brief description of what this endpoint does
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldName:
 *                 type: string
 *                 example: "value"
 *     responses:
 *       200:
 *         description: Success response description
 *       400:
 *         description: Error description
 */
router.post("/endpoint", isAuthenticated, handler);
```

## Features

✅ **No Breaking Changes** - Just adds a new route  
✅ **Try It Out** - Test endpoints directly from browser  
✅ **Auth Integration** - Shows JWT bearer token support  
✅ **Auto-Updates** - Docs regenerate on server restart  
✅ **Mobile Friendly** - Works on all devices  

## Where Documentation Is Generated From

The swagger.js file scans these route files automatically:
- `src/resources/auth/routes/*.js` ✅ (Already documented)
- `src/resources/user/routes/*.js`
- `src/resources/courses/routes/*.js`
- `src/resources/payments/routes/*.js`
- `src/resources/bookings/routes/*.js`
- `src/resources/ai-tutor/routes/*.js`

## Next Steps (Optional)

To document remaining routes, add JSDoc comments to:
1. User routes (`src/resources/user/routes/user.routes.js`)
2. Course routes (`src/resources/courses/routes/course.routes.js`)
3. Payment routes (`src/resources/payments/routes/payment.routes.js`)

Simply copy the template above for each endpoint.

## To Export as Postman Collection

Once documented:
1. Visit `https://api.postman.com/oauth2/authorize?client_id=...` 
2. Or use: `swagger2postman` CLI tool
3. Or manually import the swagger.json: `https://your-domain.com/api-docs/swagger.json`

---

**That's it! Zero stress, zero breaking changes. Docs are live!** 🎉
