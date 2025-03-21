import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/**
 * Create an educational summary using Google's Generative AI
 */
export async function createSummary(text: string, apiKey: string, maxWords: number = 2000): Promise<string> {
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
[List the main learning objectives.]

# Key Concepts:
[Define and explain important terms and concepts that underpin the learning objectives.]

# Main Content:
[Present the core material in a structured way, ensuring that it covers both foundational knowledge and higher-order thinking skills as per Bloom's Taxonomy.]

# Examples & Applications:
[Provide practical examples that illustrate the application, analysis, and synthesis of the material.]

# Key Takeaways:
[Summarize the most important points, emphasizing the learning outcomes.]

Return only the text formatted exactly as specified above. Do not include any additional commentary, concluding summaries, or extraneous text.`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Check if the response starts with the learning objectives marker
    const marker = "# Learning Objectives:";
    if (!responseText.startsWith(marker)) {
      const markerIndex = responseText.indexOf(marker);
      if (markerIndex !== -1) {
        responseText = responseText.slice(markerIndex);
      }
    }
    
    return responseText;
  } catch (error) {
    console.error("Error generating summary:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return `Error: ${errorMessage}`;
  }
}