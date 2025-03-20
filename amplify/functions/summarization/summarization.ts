import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Create an educational summary using Google's Generative AI
 */
export async function createSummary(text: string, apiKey: string, maxWords: number = 2000): Promise<string> {
  try {
    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Prepare the educational prompt
    const prompt = `As an educational content creator, create a comprehensive lesson summary of the following lecture content. 
The summary should:

1. Begin with clear learning objectives
2. Include key concepts and definitions
3. Present the main ideas in a logical, easy-to-follow structure
4. Provide relevant examples where applicable
5. End with key takeaways
6. Be approximately ${maxWords} words in length
7. Use clear, student-friendly language
8. Include bullet points and numbering for better readability
9. Use markdown formatting for better readability

Here's the lecture content to summarize:

${text}

Please structure your response as follows:

# Learning Objectives:
[List the main learning objectives]

# Key Concepts:
[Define and explain important terms and concepts]

# Main Content:
[Present the core material in a structured way]

# Examples & Applications:
[Provide practical examples]

# Key Takeaways:
[Summarize the most important points]`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return `Error: ${errorMessage}`;
  }
}