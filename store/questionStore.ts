import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  saveQuestion,
  fetchQuestions, 
  deleteQuestion as deleteQuestionFromDB,
  updateQuestion as updateQuestionInDB
} from '../lib/supabaseService';

export type QuestionType = 'MCQ' | 'LONG_ANSWER' | 'ONE_WORD' | 'FILE_UPLOAD';

export interface Question {
  id: number;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: number;
}

interface QuestionStore {
  questions: Question[];
  loading: boolean;
  error: string | null;
  initializeQuestions: () => Promise<void>;
  addQuestion: (question: Omit<Question, 'id'>) => Promise<void>;
  removeQuestion: (id: number) => Promise<void>;
  clearQuestions: () => void;
  updateQuestion: (id: number, updates: Partial<Question>) => Promise<void>;
}

export const useQuestionStore = create<QuestionStore>()(
  persist(
    (set, get) => ({
      questions: [],
      loading: false,
      error: null,
      initializeQuestions: async () => {
        set({ loading: true, error: null });
        try {
          const questions = await fetchQuestions();
          set({ questions, loading: false });
        } catch (error) {
          console.error('Failed to fetch questions:', error);
          set({ error: 'Failed to load questions', loading: false });
        }
      },
      addQuestion: async (question) => {
        set({ loading: true, error: null });
        try {
          const newQuestion = await saveQuestion(question);
          set((state) => ({
            questions: [...state.questions, newQuestion],
            loading: false
          }));
        } catch (error) {
          console.error('Failed to add question:', error);
          set({ error: 'Failed to add question', loading: false });
        }
      },
      removeQuestion: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteQuestionFromDB(id);
          set((state) => ({
            questions: state.questions.filter((q) => q.id !== id),
            loading: false
          }));
        } catch (error) {
          console.error('Failed to delete question:', error);
          set({ error: 'Failed to delete question', loading: false });
        }
      },
      clearQuestions: () => set({ questions: [] }),
      updateQuestion: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          await updateQuestionInDB(id, updates);
          set((state) => ({
            questions: state.questions.map(q => 
              q.id === id ? { ...q, ...updates } : q
            ),
            loading: false
          }));
        } catch (error) {
          console.error('Failed to update question:', error);
          set({ error: 'Failed to update question', loading: false });
        }
      }
    }),
    {
      name: 'assessment-questions',
    }
  )
);
