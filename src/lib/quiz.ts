export interface QuizQuestion {
  question: string;
  image?: string;
  answers: string[];
  correct: number;
  fact?: string;
}

export interface QuizRank {
  min: number; // prosent (0–100)
  title: string;
}

export interface QuizData {
  title: string;
  intro?: string;
  image?: string;
  ranks?: QuizRank[];
  questions: QuizQuestion[];
}
