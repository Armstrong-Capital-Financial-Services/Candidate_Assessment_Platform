import { supabase } from './supabase';
import { Question, QuestionType } from '../store/questionStore';
import { Test } from '../store/testStore';

// Questions API
export const saveQuestion = async (question: Omit<Question, 'id'>) => {
  const { data, error } = await supabase
    .from('questions')
    .insert([{ 
      question: question.question,
      type: question.type,
      options: question.options,
      correct_answer: question.correctAnswer
    }])
    .select();
  
  if (error) throw error;
  
  return {
    ...question,
    id: data[0].id
  };
};

export const fetchQuestions = async () => {
  const { data, error } = await supabase
    .from('questions')
    .select('*');
  
  if (error) throw error;
  
  return data.map((item: any) => ({
    id: item.id,
    question: item.question,
    type: item.type as QuestionType,
    options: item.options,
    correctAnswer: item.correct_answer
  }));
};

export const deleteQuestion = async (id: number) => {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const updateQuestion = async (id: number, question: Partial<Question>) => {
  const { error } = await supabase
    .from('questions')
    .update({ 
      question: question.question,
      type: question.type,
      options: question.options,
      correct_answer: question.correctAnswer
    })
    .eq('id', id);
  
  if (error) throw error;
};

// Tests API
export const saveTest = async (test: Omit<Test, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
  const { data, error } = await supabase
    .from('tests')
    .insert([{ 
      name: test.name,
      description: test.description,
      duration: test.duration,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select();
  
  if (error) throw error;
  
  const testId = data[0].id;
  
  if (test.questions && test.questions.length > 0) {
    const testQuestionLinks = test.questions.map(q => ({
      test_id: testId,
      question_id: q.id
    }));
    
    const { error: linkError } = await supabase
      .from('test_questions')
      .insert(testQuestionLinks);
    
    if (linkError) throw linkError;
  }
  
  return {
    id: testId,
    name: test.name,
    description: test.description,
    duration: test.duration,
    questions: test.questions,
    createdAt: data[0].created_at,
    updatedAt: data[0].updated_at,
    isActive: data[0].is_active
  };
};

export const fetchTests = async () => {
  const { data: testsData, error: testsError } = await supabase
    .from('tests')
    .select('*');
  
  if (testsError) throw testsError;
  
  const testsWithQuestions = await Promise.all(testsData.map(async (test) => {
    const { data: testQuestionsData, error: tqError } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', test.id);
    
    if (tqError) throw tqError;
    
    let questions: Question[] = [];
    if (testQuestionsData && testQuestionsData.length > 0) {
      const questionIds = testQuestionsData.map(tq => tq.question_id);
      
      const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);
      
      if (qError) throw qError;
      
      questions = questionsData.map((q: any) => ({
        id: q.id,
        question: q.question,
        type: q.type as QuestionType,
        options: q.options,
        correctAnswer: q.correct_answer
      }));
    }
    
    return {
      id: test.id,
      name: test.name,
      description: test.description,
      duration: test.duration,
      questions: questions,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      isActive: test.is_active
    };
  }));
  
  return testsWithQuestions;
};

export const updateTest = async (id: number, testUpdates: Partial<Test>) => {
  const updateData: any = {};
  if (testUpdates.name) updateData.name = testUpdates.name;
  if (testUpdates.description) updateData.description = testUpdates.description;
  if (testUpdates.duration) updateData.duration = testUpdates.duration;
  if (testUpdates.isActive !== undefined) updateData.is_active = testUpdates.isActive;
  updateData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('tests')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
  
  if (testUpdates.questions) {
    const { error: deleteError } = await supabase
      .from('test_questions')
      .delete()
      .eq('test_id', id);
    
    if (deleteError) throw deleteError;
    
    if (testUpdates.questions.length > 0) {
      const testQuestionLinks = testUpdates.questions.map(q => ({
        test_id: id,
        question_id: q.id
      }));
      
      const { error: insertError } = await supabase
        .from('test_questions')
        .insert(testQuestionLinks);
      
      if (insertError) throw insertError;
    }
  }
};

export const deleteTest = async (id: number) => {
  const { error: linkError } = await supabase
    .from('test_questions')
    .delete()
    .eq('test_id', id);
  
  if (linkError) throw linkError;
  
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const setActiveTest = async (testId: number | null) => {
  const { error: resetError } = await supabase
    .from('tests')
    .update({ is_active: false })
    .neq('id', -1);
  
  if (resetError) throw resetError;
  
  if (testId !== null) {
    const { error } = await supabase
      .from('tests')
      .update({ is_active: true })
      .eq('id', testId);
    
    if (error) throw error;
  }
};