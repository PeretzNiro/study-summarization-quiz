import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Define the structure for quiz questions
interface QuizQuestion {
  question: string;
  options: string[];      // Should not include A, B, C, D prefixes
  answer: string;         // Should be the full answer text, not A/B/C/D
  explanation: string;
  difficulty: string;
  topicTag?: string;
}

/**
 * Extract JSON content from model response
 * Handles various response formats that may contain JSON data
 * @param text Raw text response from the AI model
 * @returns Parsed JSON object or null if extraction fails
 */
function extractJsonFromText(text: string): any {
  try {
    // Try to parse the entire text as JSON
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to find a JSON array in the text
    const jsonPattern = /\[\s*\{.*\}\s*\]/gs;
    const match = text.match(jsonPattern);
    
    if (match && match[0]) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error("Failed to extract JSON from matched pattern:", e2);
      }
    }
    
    console.error("No valid JSON found in response");
    return null;
  }
}

/**
 * Standardizes question format by cleaning up options and answers
 * Removes letter prefixes and ensures consistent formatting
 * @param question Raw question object from AI response
 * @returns Cleaned and standardized question object
 */
function processQuestion(question: any): QuizQuestion {
  if (!question) return question;
  
  // Process options to remove A., B., C., D. prefixes
  const processedOptions = question.options?.map((option: string) => {
    // Remove A., B., C., D. prefixes (and any other letter prefix)
    return option.replace(/^[A-Z]\.\s*/i, '').trim();
  }) || [];
  
  // Process answer to extract the actual answer text
  let processedAnswer = question.answer || '';
  if (processedAnswer.match(/^[A-D]\./i)) {
    // If the answer is in format "A. Text", extract the letter
    const answerLetter = processedAnswer.charAt(0).toUpperCase();
    const answerIndex = 'ABCD'.indexOf(answerLetter);
    if (answerIndex >= 0 && answerIndex < processedOptions.length) {
      // Get the corresponding option text (already processed above)
      processedAnswer = processedOptions[answerIndex];
    } else {
      // Remove the prefix if we can't match it to an option
      processedAnswer = processedAnswer.replace(/^[A-Z]\.\s*/i, '').trim();
    }
  }
  
  return {
    question: question.question || '',
    options: processedOptions,
    answer: processedAnswer,
    explanation: question.explanation || '',
    difficulty: (question.difficulty || 'Medium').charAt(0).toUpperCase() + 
    (question.difficulty || 'Medium').slice(1).toLowerCase(),
    topicTag: question.topicTag || 'General'
  };
}

/**
 * Generate educational quiz questions based on lecture content
 * Uses Google's Gemini AI to create varied difficulty multiple-choice questions
 * @param text Lecture content or summary to generate questions from
 * @param apiKey Google Gemini API key
 * @param questionCount Number of questions to generate (default: 10)
 * @returns Array of formatted quiz questions or error message string
 */
export async function generateQuizQuestions(
  text: string, 
  apiKey: string, 
  questionCount: number = 10 // Ideal Range: 5-20 questions (for optimal quality and performance)
): Promise<QuizQuestion[] | string> {
  try {
    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,  // Controls randomness in the model's responses
        topP: 0.8,      // Controls the probability mass from which tokens are sampled
        topK: 3,     // Limits the number of possible tokens the model can pick from at each step
        maxOutputTokens: 8192 // Maximum token length for the output
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ]      
    });
    
    // Determine the difficulty distribution
    const easyCount = Math.max(2, Math.floor(questionCount * 0.3));  // At least 30% easy
    const hardCount = Math.max(2, Math.floor(questionCount * 0.2));  // At least 20% hard
    const mediumCount = questionCount - easyCount - hardCount;  // Remaining questions are medium
    
    // Prepare the quiz generation prompt
    const prompt = `As an educational assessment expert, create ${questionCount} multiple-choice quiz questions based on the following lecture content.
        
The questions should be distributed as follows:
- ${easyCount} easy questions (basic understanding)
- ${mediumCount} medium questions (application of concepts)
- ${hardCount} hard questions (analysis or advanced application)

For each question:
1. Write a clear question.
2. Provide exactly 4 answer choices labeled A, B, C, and D. Each option should start with "A. ", "B. ", "C. ", or "D. " followed by the answer text.
3. Indicate the correct answer as "A. [text]", "B. [text]", etc.
4. Provide a brief explanation of why the answer is correct.
5. Assign a difficulty level (Easy, Medium, Hard).
6. Assign a topic tag that categorizes what concept this question is testing.

Format each question as follows:
{
"question": "What is...",
"options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
"answer": "A. Option 1",
"explanation": "This is correct because...",
"difficulty": "Easy|Medium|Hard",
"topicTag": "relevant topic or concept"
}

Here's the lecture content:

${text}

Return ONLY a valid JSON array of questions without any additional text.`;

    // Generate quiz questions
    const response = await model.generateContent(prompt);
    const result = response.response.text();
    
    // Process the response
    if (result) {
      // Extract JSON array from response
      const questions = extractJsonFromText(result);
      
      if (Array.isArray(questions)) {
        // Validate the structure of each question and process the options/answers
        const validatedQuestions = questions
          .filter(q => 
            q.question && 
            Array.isArray(q.options) && 
            q.answer && 
            q.explanation
          )
          .map(q => processQuestion(q));
        
        return validatedQuestions;
      } else {
        return "Error: Failed to extract valid questions from model response";
      }
    } else {
      return "Error: No response received from Gemini API";
    }
      
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return `Error: ${errorMessage}`;
  }
}