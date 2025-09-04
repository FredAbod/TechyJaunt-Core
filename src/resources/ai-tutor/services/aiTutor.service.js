import Groq from "groq-sdk";
import AppError from "../../../utils/lib/appError.js";
import AITutorHistory from "../models/aiTutorHistory.js";

class AITutorService {
  constructor() {
    // Initialize Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
  }

  /**
   * Generate educational content for a given topic
   */
  async generateTopicExplanation(topic, userLevel = "intermediate", specificQuestions = []) {
    try {
      let prompt = `You are an expert AI tutor for TechyJaunt Learning Platform. 
      
Your task is to provide comprehensive, educational content about the topic: "${topic}"

User's learning level: ${userLevel}

Please provide:
1. A clear, concise explanation of the topic
2. Key concepts and important points
3. Real-world applications and examples
4. Common misconceptions to avoid
5. Practical tips for learning/implementing this topic
6. Related topics the student should explore next

${specificQuestions.length > 0 ? `\nThe student also has specific questions: ${specificQuestions.join(', ')}` : ''}

Format your response in a structured, easy-to-read manner. Use markdown formatting where appropriate.
Make sure the explanation is appropriate for a ${userLevel} level learner.
Be encouraging and supportive in your teaching style.

Keep the response comprehensive but not overwhelming (aim for 300-600 words).`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert AI tutor specializing in technology, programming, data science, and related fields. You provide clear, structured, and engaging educational content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant", // Using Llama 3 8B model
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new AppError("Failed to generate AI response", 500);
      }

      return {
        topic,
        userLevel,
        explanation: response,
        generatedAt: new Date().toISOString(),
        model: "llama-3.1-8b-instant",
        metadata: {
          tokens_used: completion.usage?.total_tokens || 0,
          response_time: Date.now()
        }
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle Groq API specific errors
      if (error.status === 401) {
        throw new AppError("AI service authentication failed. Please contact support.", 500);
      } else if (error.status === 429) {
        throw new AppError("AI service is currently busy. Please try again in a moment.", 429);
      } else if (error.status === 400) {
        throw new AppError("Invalid request to AI service. Please refine your topic.", 400);
      }
      
      throw new AppError(error.message || "Failed to generate AI tutoring response", 500);
    }
  }

  /**
   * Generate study plan for a topic
   */
  async generateStudyPlan(topic, duration = "1 week", goals = []) {
    try {
      let prompt = `Create a detailed study plan for learning: "${topic}"

Duration: ${duration}
${goals.length > 0 ? `Learning goals: ${goals.join(', ')}` : ''}

Please provide:
1. Daily breakdown of what to study
2. Learning objectives for each day
3. Recommended resources and activities
4. Practice exercises or projects
5. Assessment checkpoints
6. Tips for effective learning

Format as a structured study plan that's practical and achievable within the given timeframe.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert educational planner who creates effective, practical study plans for technology and programming topics."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new AppError("Failed to generate study plan", 500);
      }

      return {
        topic,
        duration,
        goals,
        studyPlan: response,
        generatedAt: new Date().toISOString(),
        model: "llama-3.1-8b-instant"
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message || "Failed to generate study plan", 500);
    }
  }

  /**
   * Answer specific questions about a topic
   */
  async answerQuestion(question, context = "", userLevel = "intermediate") {
    try {
      let prompt = `Answer this specific question: "${question}"

${context ? `Context/Background: ${context}` : ''}
User level: ${userLevel}

Provide a clear, accurate answer that:
1. Directly addresses the question
2. Explains the reasoning behind the answer
3. Includes relevant examples if helpful
4. Suggests related concepts to explore
5. Is appropriate for a ${userLevel} level learner

Be concise but thorough in your explanation.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a knowledgeable AI tutor who provides accurate, helpful answers to student questions about technology, programming, and related subjects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 512,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new AppError("Failed to generate answer", 500);
      }

      return {
        question,
        context,
        userLevel,
        answer: response,
        generatedAt: new Date().toISOString(),
        model: "llama-3.1-8b-instant"
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message || "Failed to answer question", 500);
    }
  }

  /**
   * Generate practice exercises for a topic
   */
  async generatePracticeExercises(topic, difficulty = "intermediate", count = 3) {
    try {
      let prompt = `Generate ${count} practice exercises for the topic: "${topic}"

Difficulty level: ${difficulty}

For each exercise, provide:
1. Exercise title
2. Clear problem statement
3. Learning objectives
4. Hints or guidance
5. Expected outcome or solution approach

Make the exercises practical and hands-on. Ensure they progressively build understanding of the topic.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an educational content creator who designs practical, engaging exercises that help students learn and apply concepts effectively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.8,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new AppError("Failed to generate exercises", 500);
      }

      return {
        topic,
        difficulty,
        exerciseCount: count,
        exercises: response,
        generatedAt: new Date().toISOString(),
        model: "llama-3.1-8b-instant"
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message || "Failed to generate practice exercises", 500);
    }
  }

  /**
   * Get available AI models and service status
   */
  async getServiceStatus() {
    try {
      // Test API connection with a simple request
      const testCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Say 'AI Tutor service is operational' if you can respond."
          }
        ],
        model: "llama-3.1-8b-instant",
        max_tokens: 20,
      });

      return {
        status: "operational",
        message: "AI Tutor service is running properly",
        availableModels: ["llama-3.1-8b-instant"],
        testResponse: testCompletion.choices[0]?.message?.content,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: "error",
        message: "AI Tutor service is currently unavailable",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get user's AI interaction history
   */
  async getUserHistory(userId, options = {}) {
    try {
      const {
        limit = 50,
        page = 1,
        courseId,
        type
      } = options;

      // Get paginated history
      const history = await AITutorHistory.getUserHistory(userId, {
        limit: parseInt(limit),
        page: parseInt(page),
        courseId,
        type
      });

      // Get total count for pagination
      const query = { userId, isArchived: false };
      if (courseId) query.courseId = courseId;
      if (type) query.interactionType = type;
      
      const totalCount = await AITutorHistory.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      // Get summary statistics
      const stats = await AITutorHistory.aggregate([
        { $match: { userId: userId, isArchived: false } },
        {
          $group: {
            _id: "$interactionType",
            count: { $sum: 1 }
          }
        }
      ]);

      const interactionStats = {};
      stats.forEach(stat => {
        interactionStats[stat._id] = stat.count;
      });

      // Group by course for better organization
      const courseSummary = await AITutorHistory.aggregate([
        { $match: { userId: userId, isArchived: false, courseId: { $exists: true } } },
        {
          $group: {
            _id: "$courseId",
            count: { $sum: 1 },
            lastInteraction: { $max: "$createdAt" }
          }
        },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course"
          }
        },
        {
          $unwind: "$course"
        },
        {
          $project: {
            courseId: "$_id",
            courseTitle: "$course.title",
            thumbnail: "$course.thumbnail",
            interactionCount: "$count",
            lastInteraction: "$lastInteraction"
          }
        },
        { $sort: { lastInteraction: -1 } }
      ]);

      return {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit)
        },
        statistics: {
          totalInteractions: totalCount,
          interactionTypes: interactionStats,
          courseSummary
        }
      };

    } catch (error) {
      throw new AppError(error.message || "Failed to retrieve AI tutor history", 500);
    }
  }

  /**
   * Save AI interaction to history
   */
  async saveInteraction(userId, interactionData) {
    try {
      const historyEntry = new AITutorHistory({
        userId,
        courseId: interactionData.courseId,
        interactionType: interactionData.type,
        topic: interactionData.topic,
        userInput: interactionData.userInput,
        aiResponse: interactionData.aiResponse,
        userLevel: interactionData.userLevel,
        metadata: {
          model: interactionData.model || "llama-3.1-8b-instant",
          tokensUsed: interactionData.tokensUsed || 0,
          responseTime: interactionData.responseTime || 0,
          sessionId: interactionData.sessionId
        },
        tags: interactionData.tags || []
      });

      await historyEntry.save();
      return historyEntry;

    } catch (error) {
      // Log error but don't fail the main request
      console.error("Failed to save AI interaction history:", error);
      return null;
    }
  }

  /**
   * Get detailed history item
   */
  async getHistoryItem(userId, historyId) {
    try {
      const historyItem = await AITutorHistory.getHistoryItem(userId, historyId);
      
      if (!historyItem) {
        throw new AppError("History item not found", 404);
      }

      return historyItem;

    } catch (error) {
      throw new AppError(error.message || "Failed to retrieve history item", 500);
    }
  }
}

export default new AITutorService();
