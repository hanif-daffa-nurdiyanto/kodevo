import { Level, EnrollmentStatus } from "@kodevo/db"

export type { Level, EnrollmentStatus }

export type LearningStyle = "READ_FIRST" | "CHUNK_QUIZ" | "CHALLENGE_FIRST"
export type GuidancePreference = "GUIDED" | "SEMI_GUIDED" | "INDEPENDENT"

export interface ScreeningQuestion {
  id: string
  type: "mcq" | "analysis"
  category?: "level" | "preference"
  question: string
  options?: string[]
  correctAnswer?: string
  targetLevel?: Level
}

export interface ScreeningAnswer {
  questionId: string
  question: string
  userAnswer: string
  correctAnswer?: string
  type: "mcq" | "analysis"
  category?: "level" | "preference"
}

export interface UserProgress {
  moduleId: string
  moduleTitle: string
  completedTopics: number
  totalTopics: number
  averageScore: number
  status: EnrollmentStatus
}

export interface DashboardData {
  user: {
    name: string | null
    level: Level
    isPremium: boolean
    currentStreak: number
  }
  progress: UserProgress[]
  recentSubmissions: Array<{
    id: string
    exerciseId: string
    topicTitle: string
    score: number | null
    passed: boolean
    submittedAt: Date
  }>
  nextRecommendation: {
    moduleId: string
    moduleTitle: string
    topicId: string
    topicTitle: string
  } | null
}
