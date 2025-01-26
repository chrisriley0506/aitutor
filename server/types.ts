export interface ChatResponse {
  message: string;
  context?: string;
  suggestions?: string[];
}

export interface CourseContext {
  name: string;
  subject: string;
  gradeLevel: string;
  currentTopic: string;
  standard?: {
    identifier: string;
    description: string;
  } | null;
}
