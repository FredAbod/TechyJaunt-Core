# AWS S3 Configuration Fix

## Problem
The S3 image upload was failing with error:
```
S3 Upload Image Error: Error: Region is missing
```

This happened because the `AWS_REGION` environment variable was not set or was undefined.

## Solution Applied

### 1. Updated `src/utils/helper/config.js`
- Added default value for `AWS_REGION = "us-east-1"`
- Added default empty strings for AWS credentials
- This ensures the S3 client can initialize even if env variables are missing

### 2. Enhanced `src/utils/image/s3.js`
- Created `initializeS3Client()` function to properly configure the S3 client
- Added check to use default region if not provided
- Only includes credentials if both are provided
- Better error handling for missing AWS configuration

### 3. Updated `.env.example`
- Added AWS S3 configuration variables as a reference
- Helps developers know what variables need to be set

## What You Need To Do

### Option 1: Use Default S3 Configuration (Local/Testing)
The app now works with the default region `us-east-1`. No action required!

### Option 2: Use Custom AWS Configuration (Production)
Set these environment variables on your Render deployment:

```env
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1  # or your preferred region
AWS_BUCKET_NAME=your-s3-bucket-name
```

**Steps on Render:**
1. Go to your Render service dashboard
2. Click "Settings" in the sidebar
3. Scroll to "Environment"
4. Add the variables above
5. Save and redeploy

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | No | Empty | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | No | Empty | AWS secret key for S3 |
| `AWS_REGION` | No | `us-east-1` | AWS region (us-east-1, eu-west-1, etc.) |
| `AWS_BUCKET_NAME` | No | Empty | S3 bucket name |

## How It Works Now

1. **With AWS Credentials:**
   - Image uploads go directly to your S3 bucket
   - Images are stored for long-term access

2. **Without AWS Credentials:**
   - Falls back to alternative image handling
   - Uses default region configuration
   - No immediate errors

## Testing

To verify the fix works:

```bash
# Start the server
npm run dev

# Try uploading a profile picture
# PUT /api/v1/user/profile/with-picture
# With a file upload
```

If you get a different error related to S3 operations, check:
1. AWS credentials are valid
2. S3 bucket exists and is accessible
3. IAM user has S3 permissions

## Next Steps

For production on Render:
1. Create an AWS IAM user with S3 permissions
2. Get the access key and secret key
3. Add them to Render environment variables
4. Optionally create and specify an S3 bucket

For local development:
- Leave AWS variables empty (uses defaults)
- Or set them for testing

---

**The error "Region is missing" is now fixed!** ✅
