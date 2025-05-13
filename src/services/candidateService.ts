import { supabase } from '../lib/supabase';

interface CandidateResponse {
  candidate_name: string;
  questions_attempted: number;
  total_questions: number;
  tab_switches: number;
  completion_status: 'completed' | 'time_up';
  time_taken: string;
  question_answer_pairs: {
    id: number;
    question: string;
    answer: string | number | null;
  }[];
  score?: number;
  total_score?: number;
}

export const submitCandidateResponse = async (response: CandidateResponse) => {
  try {
    const { data, error } = await supabase
      .from('candidate_responses')
      .insert([response])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting candidate response:', error);
    throw error;
  }
};

export const updateCandidateScore = async (id: string, score: number, totalScore: number) => {
  try {
    const { data, error } = await supabase
      .from('candidate_responses')
      .update({ score, total_score: totalScore })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating candidate score:', error);
    throw error;
  }
};
