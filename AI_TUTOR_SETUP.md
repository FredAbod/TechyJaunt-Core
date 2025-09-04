# AI Tutor Setup Guide

## 🤖 Groq API Integration Setup

The TechyJaunt LMS now includes AI Tutor functionality powered by Groq's Llama 3 8B model. Follow these steps to set it up:

## 1. Get Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Create a free account or log in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the API key (starts with `gsk_...`)

## 2. Environment Configuration

Add your Groq API key to your `.env` file:

```bash
# Groq AI Configuration (for AI Tutor)
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

## 3. Available AI Tutor Features

The AI Tutor provides the following features for users with active subscriptions:

### Topic Explanations
- Comprehensive educational content about any topic
- Adjustable difficulty levels (beginner, intermediate, advanced)
- Support for specific questions
- Real-world examples and applications

### Study Plan Generation
- Personalized learning roadmaps
- Flexible durations (3 days to 3 months)
- Custom learning goals
- Daily breakdown of activities

### Interactive Q&A
- Answer specific programming and tech questions
- Context-aware responses
- Code examples and best practices
- Learning guidance and tips

### Practice Exercises
- Auto-generated coding challenges
- Difficulty-based problems
- Progressive skill building
- Practical applications

## 4. Subscription Requirements

AI Tutor access is tied to subscription plans:

- **Bronze Plan (₦15,800)**: 1-month AI Tutor access
- **Silver Plan (₦30,000)**: 1-month AI Tutor access + mentorship
- **Gold Plan (₦40,800)**: 1-month AI Tutor access + full features

## 5. API Endpoints

All AI Tutor endpoints require authentication and valid subscription:

```bash
# Get access information
GET /api/v1/ai-tutor/access

# Get topic explanation
POST /api/v1/ai-tutor/explain
{
  "topic": "React Hooks",
  "userLevel": "intermediate",
  "specificQuestions": ["What is useState?"]
}

# Generate study plan
POST /api/v1/ai-tutor/study-plan
{
  "topic": "Full Stack Development",
  "duration": "2 weeks",
  "goals": ["Build a complete app"]
}

# Ask question
POST /api/v1/ai-tutor/question
{
  "question": "What is the difference between let and const?",
  "userLevel": "beginner"
}

# Generate exercises
POST /api/v1/ai-tutor/exercises
{
  "topic": "JavaScript Arrays",
  "difficulty": "intermediate",
  "count": 3
}

# Check service status
GET /api/v1/ai-tutor/status
```

## 6. Rate Limiting

AI Tutor endpoints have specialized rate limiting:

- **General AI endpoints**: 20 requests per 15 minutes
- **AI generation endpoints**: 10 requests per 10 minutes

## 7. Testing

Run the AI Tutor test script to verify everything works:

```bash
# Set your JWT token in the script first
bash test-ai-tutor.sh

# Or use the Node.js version
TEST_JWT_TOKEN=your_jwt_token node test-ai-tutor.js
```

## 8. Troubleshooting

### Common Issues:

**Error: "GROQ_API_KEY environment variable is missing"**
- Solution: Add GROQ_API_KEY to your .env file

**Error: "AI Tutor access requires an active subscription"**
- Solution: Ensure the user has Bronze, Silver, or Gold subscription

**Error: "AI service authentication failed"** 
- Solution: Check that your Groq API key is valid and active

**Error: "AI service is currently busy"**
- Solution: This is a rate limit from Groq, wait and try again

### Rate Limit Issues:
- Groq has generous free tier limits
- If you hit limits, consider upgrading Groq plan or implementing caching

### API Response Issues:
- Groq models occasionally have downtime
- Implement retry logic in production
- Consider fallback responses

## 9. Production Considerations

1. **API Key Security**: Store GROQ_API_KEY securely
2. **Rate Limiting**: Monitor usage and adjust limits
3. **Error Handling**: Implement proper error responses
4. **Caching**: Consider caching common responses
5. **Monitoring**: Log AI requests for analytics
6. **Fallbacks**: Have backup responses for service outages

## 10. Model Information

- **Model**: Llama 3 8B (llama-3.1-8b-instant)
- **Context Window**: 8,192 tokens
- **Temperature**: Varies by endpoint (0.5-0.8)
- **Max Tokens**: 512-1024 depending on endpoint

## 🎉 Ready to Go!

Once you've added the GROQ_API_KEY to your environment, restart the server and the AI Tutor will be fully functional for users with valid subscriptions!
