import OpenAI from "openai";

// Initialize OpenAI client with the API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Add diagnostic logging
console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('OpenAI API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 3));

interface PDFAnalysisInput {
  content: string;
  metadata: {
    grade: string;
    subject: string;
    courseId: number;
    standardsSystem: string;
  };
}

interface Lesson {
  day: number;
  title: string;
  standard: string | null;
}

export async function analyzePDFContent(input: PDFAnalysisInput): Promise<{ lessons: Lesson[] }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    console.log('Starting PDF analysis for', input.metadata.subject, 'Grade', input.metadata.grade);
    console.log('Content sample:', input.content.slice(0, 200));

    // Retry logic for rate limits
    let retries = 3;
    let lastError: Error | null = null;
    const baseDelay = 3000; // Start with a 3 second delay

    while (retries > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert curriculum analyzer for ${input.metadata.grade} grade ${input.metadata.subject}.
You will receive text from a pacing guide PDF that may be related to ${input.metadata.standardsSystem}. Extract lessons and format them as a clean JSON array.

Guidelines:
1. Each lesson should have:
   - day: sequential number starting from 1
   - title: clear, concise lesson title
   - standard: standard code (like "CC.3.NBT.1") or null for tests/reviews
2. Clean any special characters from titles
3. Ensure all JSON strings are properly escaped
4. Keep titles under 100 characters

Format your response EXACTLY as this JSON:
{
  "lessons": [
    {
      "day": 1,
      "title": "Introduction to Addition",
      "standard": "CC.3.NBT.1"
    }
  ]
}`
            },
            {
              role: "user",
              content: input.content
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("No response received from OpenAI");
        }

        console.log('Raw OpenAI response:', content);

        // Clean the response before parsing
        const cleanedContent = content
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
          .replace(/\\[^"\\\/bfnrtu]/g, "\\\\") // Escape backslashes
          .replace(/\r?\n|\r/g, " ") // Replace newlines with spaces
          .trim();

        try {
          const parsed = JSON.parse(cleanedContent);

          if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
            throw new Error("Invalid response structure");
          }

          // Validate and clean each lesson
          const validLessons = parsed.lessons
            .filter((lesson: any) => 
              lesson && 
              typeof lesson.day === "number" &&
              typeof lesson.title === "string" && 
              lesson.title.trim() &&
              (lesson.standard === null || typeof lesson.standard === "string")
            )
            .map((lesson: any) => ({
              day: lesson.day,
              title: lesson.title.trim().slice(0, 100), // Limit title length
              standard: lesson.standard
            }));

          if (validLessons.length === 0) {
            throw new Error("No valid lessons found");
          }

          console.log('Successfully parsed lessons:', validLessons.slice(0, 2));
          return { lessons: validLessons };
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Content that failed to parse:', cleanedContent);
          throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
        }

      } catch (error: any) {
        lastError = error;
        console.error('OpenAI API attempt failed:', error);

        if (error?.status === 429) { // Rate limit error
          retries--;
          if (retries > 0) {
            const delay = baseDelay * (3 - retries); // Exponential backoff
            console.log(`Rate limit hit, retrying in ${delay}ms... ${retries} attempts remaining`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else if (error?.status >= 500) {
          retries--;
          if (retries > 0) {
            const delay = baseDelay * (3 - retries);
            console.log(`Server error, retrying in ${delay}ms... ${retries} attempts remaining`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }

    // If we get here, we've exhausted retries
    const errorMessage = lastError instanceof Error 
      ? lastError.message 
      : "Failed to process after retries";

    console.error('All retries exhausted:', errorMessage);
    throw new Error(`Failed to process pacing guide: ${errorMessage}`);

  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error instanceof Error ? error : new Error("Failed to analyze curriculum");
  }
}

export async function analyzeTopic(
  description: string,
  grade: string,
  subject: string,
  standardsSystem: string
): Promise<{
  standards: Array<{
    id: string;
    description: string;
    grade: string;
    subject: string;
    confidence: number;
  }>;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert curriculum analyzer. Extract lessons and standards from educational content.
Format your response EXACTLY as this JSON (no other text):
{
  "standards": [
    {
      "id": "CC.3.NBT.1",
      "description": "Round numbers",
      "grade": "${grade}",
      "subject": "${subject}",
      "confidence": 1
    }
  ]
}
- For id: extract standard ID if it matches format ${standardsSystem}, otherwise use null
- For description: extract the main topic or learning objective
- Always include grade and subject as provided
- Set confidence to 1`
        },
        {
          role: "user",
          content: description,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    console.log('Raw OpenAI response:', content);

    try {
      // Clean and parse response
      const cleanedContent = content
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('Cleaned content:', cleanedContent);

      const parsed = JSON.parse(cleanedContent);

      if (!parsed.standards || !Array.isArray(parsed.standards)) {
        console.error("Invalid response structure:", cleanedContent);
        throw new Error("Invalid response structure from OpenAI");
      }

      // Filter and validate standards
      const validStandards = parsed.standards
        .filter((standard: any) => standard && typeof standard.description === 'string' && standard.description.trim())
        .map((standard: any) => ({
          id: standard.id || null,
          description: standard.description.trim(),
          grade,
          subject,
          confidence: 1
        }));

      if (validStandards.length === 0) {
        throw new Error("No valid lessons found in the response");
      }

      console.log('Validated standards:', validStandards);
      return { standards: validStandards };
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      console.error("Parse error:", parseError);
      throw new Error("Failed to parse OpenAI response");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze topic");
  }
}

export async function generateTutorResponse(
  message: string,
  courseContext: CourseContext,
  materials?: { content: string; type: string }[]
): Promise<ChatResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const gradeNumber = parseInt(courseContext.gradeLevel) || 1;
    const maxSentenceLength = Math.min(8 + gradeNumber * 2, 20);
    const maxWordLength = Math.min(4 + Math.floor(gradeNumber / 2), 8);

    let systemPrompt = `You are a friendly AI tutor for a ${courseContext.gradeLevel} grade ${courseContext.subject} class.
    The class is currently learning about: "${courseContext.currentTopic}"
    ${courseContext.standard ?
      `This connects to standard ${courseContext.standard.identifier}: ${courseContext.standard.description}`
      : ''
    }

    Important guidelines for your responses:
    1. Use language appropriate for ${courseContext.gradeLevel} grade:
       - Keep sentences to ${maxSentenceLength} words or less
       - Use mostly words with ${maxWordLength} letters or less
       - Break longer words into simpler ones when possible
    2. Explain things step by step, like you're talking to a friend
    3. Use examples from a ${courseContext.gradeLevel} grader's daily life
    4. Break down complex ideas into smaller, easier parts
    5. Be encouraging and positive
    6. If using numbers, keep them within grade-appropriate ranges
    7. Define any word that might be new to a ${courseContext.gradeLevel} grade student

    Grade-specific adjustments:
    ${gradeNumber <= 3 ? `
    - Use very simple words and short sentences
    - Explain with pictures and real things they can touch
    - Use lots of examples from home and school
    - Keep numbers small and easy to understand
    ` : gradeNumber <= 6 ? `
    - Use clear, straightforward language
    - Include some new vocabulary, but explain it clearly
    - Use examples from both school and wider experiences
    - Include moderate-sized numbers and basic fractions
    ` : `
    - Use more varied vocabulary
    - Include academic terms with explanations
    - Use real-world examples and applications
    - Work with larger numbers and more complex math
    `}

    Your response must be in this JSON format:
    {
      "message": "[your grade-appropriate response here]",
      "context": "[simple background info if needed]",
      "suggestions": ["easy follow-up question 1", "easy follow-up question 2", "easy follow-up question 3"]
    }

    Make sure your response is a valid JSON object with these exact keys.`;

    // Add course materials context if available
    if (materials && materials.length > 0) {
      systemPrompt += `\n\nHere are some helpful materials to reference:\n${materials
        .map((m) => `${m.type}: ${m.content}`)
        .join("\n")}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response received from OpenAI");
    }

    try {
      return JSON.parse(content) as ChatResponse;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      // Fallback response if JSON parsing fails
      return {
        message: content,
        suggestions: ["Can you tell me more?", "Would you like another example?", "What else should we practice?"],
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate tutor response");
  }
}

export async function analyzeMaterial(content: string): Promise<{
  summary: string;
  keyPoints: string[];
  difficulty: number;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const systemPrompt = `Analyze the educational material and provide your response in this exact JSON format:
    {
      "summary": "A concise summary of the material",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "difficulty": 3
    }
    The difficulty should be a number between 1-5. Make sure your response is valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.3,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No response received from OpenAI");
    }

    try {
      return JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      throw new Error("Failed to analyze material: Invalid response format");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze material");
  }
}

type ChatResponse = {
  message: string;
  context?: string;
  suggestions?: string[];
};

type CourseContext = {
  name: string;
  subject: string;
  gradeLevel: string;
  currentTopic: string;
  standard?: {
    identifier: string;
    description: string;
  } | null;
};