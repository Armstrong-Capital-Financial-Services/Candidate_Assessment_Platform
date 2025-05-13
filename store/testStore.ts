import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question } from './questionStore';
import { 
  saveTest, 
  fetchTests, 
  updateTest as updateTestInDB, 
  deleteTest as deleteTestFromDB,
  setActiveTest as setActiveTestInDB
} from '../lib/supabaseService';

export interface Test {
  id: number;
  name: string;
  description: string;
  duration: number; // in minutes
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface TestStore {
  tests: Test[];
  currentTest: Test | null;
  activeTest: Test | null;
  loading: boolean;
  error: string | null;
  initializeTests: () => Promise<void>;
  addTest: (test: Omit<Test, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<void>;
  updateTest: (id: number, test: Partial<Test>) => Promise<void>;
  removeTest: (id: number) => Promise<void>;
  setCurrentTest: (test: Test | null) => void;
  setActiveTest: (test: Test | null) => Promise<void>;
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      tests: [],
      currentTest: null,
      activeTest: null,
      loading: false,
      error: null,
      
      initializeTests: async () => {
        set({ loading: true, error: null });
        try {
          const tests = await fetchTests();
          const activeTest = tests.find(test => test.isActive) || null;
          set({ tests, activeTest, loading: false });
        } catch (error) {
          console.error('Failed to fetch tests:', error);
          set({ error: 'Failed to load tests', loading: false });
        }
      },
      
      addTest: async (test) => {
        set({ loading: true, error: null });
        try {
          const newTest = await saveTest(test);
          set((state) => ({
            tests: [...state.tests, newTest],
            loading: false
          }));
        } catch (error) {
          console.error('Failed to add test:', error);
          set({ error: 'Failed to add test', loading: false });
        }
      },
      
      updateTest: async (id, updatedTest) => {
        set({ loading: true, error: null });
        try {
          await updateTestInDB(id, updatedTest);
          
          set((state) => {
            const testIndex = state.tests.findIndex(test => test.id === id);
            if (testIndex === -1) return state;
            
            const updatedTests = [...state.tests];
            updatedTests[testIndex] = {
              ...updatedTests[testIndex],
              ...updatedTest,
              updatedAt: new Date().toISOString()
            };
            
            let newActiveTest = state.activeTest;
            if (state.activeTest?.id === id) {
              newActiveTest = updatedTests[testIndex];
            }
            
            return {
              tests: updatedTests,
              activeTest: newActiveTest,
              loading: false
            };
          });
        } catch (error) {
          console.error('Failed to update test:', error);
          set({ error: 'Failed to update test', loading: false });
        }
      },
      
      removeTest: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteTestFromDB(id);
          
          set((state) => {
            const updatedTests = state.tests.filter(test => test.id !== id);
            const newActiveTest = state.activeTest?.id === id ? null : state.activeTest;
            
            return {
              tests: updatedTests,
              activeTest: newActiveTest,
              loading: false
            };
          });
        } catch (error) {
          console.error('Failed to delete test:', error);
          set({ error: 'Failed to delete test', loading: false });
        }
      },
      
      setCurrentTest: (test) => set({ currentTest: test }),
      
      setActiveTest: async (test) => {
        set({ loading: true, error: null });
        try {
          if (test) {
            await setActiveTestInDB(test.id);
          } else {
            await setActiveTestInDB(null);
          }
          
          set((state) => {
            const updatedTests = state.tests.map(t => ({
              ...t,
              isActive: t.id === test?.id
            }));
            
            return {
              tests: updatedTests,
              activeTest: test,
              loading: false
            };
          });
        } catch (error) {
          console.error('Failed to set active test:', error);
          set({ error: 'Failed to set active test', loading: false });
        }
      }
    }),
    {
      name: 'assessment-tests',
    }
  )
);