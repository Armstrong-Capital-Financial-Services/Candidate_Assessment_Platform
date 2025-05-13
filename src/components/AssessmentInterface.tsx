import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Upload, CheckCircle, Timer, FileText, User } from 'lucide-react';
import { Question } from '../store/questionStore';
import { submitCandidateResponse } from '../services/candidateService';
import { processFileUploads } from '../services/supabaseFileService';

interface AssessmentInterfaceProps {
  tabSwitchCount: number;
  timeRemaining: number;
  isTimeUp: boolean;
  onSubmit: () => void;
  questions: Question[];
  candidateName: string;
  isSubmitted: boolean; 
  timeTaken?: string; 
}

const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  tabSwitchCount,
  timeRemaining,
  isTimeUp,
  onSubmit,
  questions,
  candidateName,
  isSubmitted,
  timeTaken = '0:00',
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number | File>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);

  useEffect(() => {
    if (isTimeUp && !isSubmitted && !isSubmitting) {
      handleSubmit();
    }
  }, [isTimeUp, isSubmitted, isSubmitting]);

  const calculateScore = (processedAnswers: Record<number, any>) => {
    let score = 0;
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');
    const total = mcqQuestions.length;

    mcqQuestions.forEach(question => {
      if (processedAnswers[question.id] === question.correctAnswer) {
        score += 1;
      }
    });

    return { score, total };
  };

  const handleAnswerSelect = (questionId: number, answer: string | number | File) => {
    if (isTimeUp || isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      let processedAnswers = { ...answers };
      
      const hasFiles = Object.values(answers).some(answer => answer instanceof File);
      
      if (hasFiles) {
        try {
          processedAnswers = await processFileUploads(answers, candidateName);
        } catch (fileError) {
          console.error('Error processing file uploads:', fileError);
          setSubmissionError(`Failed to upload files: ${fileError.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Calculate score before submission
      const { score: calculatedScore, total: calculatedTotal } = calculateScore(processedAnswers);
      setScore(calculatedScore);
      setTotalScore(calculatedTotal);

      // Prepare the result object with processed answers and scores
      const result = {
        candidate_name: candidateName,
        questions_attempted: Object.keys(answers).length,
        total_questions: questions.length,
        tab_switches: tabSwitchCount,
        completion_status: isTimeUp ? 'time_up' : 'completed',
        time_taken: timeTaken,
        question_answer_pairs: questions.map(q => ({
          id: q.id,
          question: q.question,
          answer: processedAnswers[q.id] ?? null
        })),
        score: calculatedScore,
        total_score: calculatedTotal
      };

      await submitCandidateResponse(result);
      onSubmit();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setSubmissionError('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };  

  const handleFileUpload = (questionId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAnswerSelect(questionId, file);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const allQuestionsAnswered = Object.keys(answers).length === questions.length;
  const totalQuestionsAttempted = Object.keys(answers).length;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Assessment Submitted</h2>
            <p className="text-gray-600 mt-2">Thank you for completing the assessment, {candidateName}.</p>
          </div>
          
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Candidate</span>
                </div>
                <span className="font-medium text-blue-700">{candidateName}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="text-gray-700">Questions Attempted</span>
                </div>
                <span className="font-medium text-indigo-700">{totalQuestionsAttempted} of {questions.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Timer className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Time Taken</span>
                </div>
                <span className="font-medium text-green-700">{timeTaken}</span>
              </div>

              {score !== null && totalScore !== null && (
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">Score</span>
                  </div>
                  <span className="font-medium text-purple-700">{score} / {totalScore}</span>
                </div>
              )}
              
              {tabSwitchCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-gray-700">Tab Switches</span>
                  </div>
                  <span className="font-medium text-red-700">{tabSwitchCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
          <p className="text-gray-600">Please wait for the administrator to add questions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="fixed top-4 left-4 bg-white px-4 py-2 rounded-lg shadow flex items-center space-x-2">
        <User className="w-5 h-5 text-indigo-600" />
        <span className="font-medium">{candidateName}</span>
      </div>
      
      {tabSwitchCount > 0 && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Tab switches detected: {tabSwitchCount}</span>
        </div>
      )}

      {submissionError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {submissionError}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className={`font-medium ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-500'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-lg text-gray-800 font-medium select-none">
              {currentQuestion.question}
            </div>

            <div className="space-y-3">
              {currentQuestion.type === 'MCQ' && currentQuestion.options?.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer select-none
                    ${answers[currentQuestion.id] === index 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${answers[currentQuestion.id] === index 
                        ? 'border-indigo-500 bg-indigo-500' 
                        : 'border-gray-300'}`}
                    >
                      {answers[currentQuestion.id] === index && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-gray-700">{option}</span>
                  </div>
                </div>
              ))}

              {currentQuestion.type === 'LONG_ANSWER' && (
                <textarea
                  className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows={6}
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                />
              )}

              {currentQuestion.type === 'ONE_WORD' && (
                <input
                  type="text"
                  className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer..."
                />
              )}

              {currentQuestion.type === 'FILE_UPLOAD' && (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id={`file-upload-${currentQuestion.id}`}
                      className="hidden"
                      onChange={(e) => handleFileUpload(currentQuestion.id, e)}
                    />
                    <label
                      htmlFor={`file-upload-${currentQuestion.id}`}
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-gray-600">Click to upload or drag and drop</span>
                      <span className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG files are supported</span>
                    </label>
                  </div>
                  {answers[currentQuestion.id] instanceof File && (
                    <div className="text-sm flex items-center justify-between bg-blue-50 p-3 rounded">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-blue-700">{(answers[currentQuestion.id] as File).name}</span>
                      </div>
                      <button 
                        onClick={() => handleAnswerSelect(currentQuestion.id, '')}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className={`px-6 py-2 rounded-lg transition
              ${currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Previous
          </button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!allQuestionsAnswered && !Object.keys(answers).length)}
              className={`px-6 py-2 rounded-lg transition flex items-center space-x-2
                ${isSubmitting 
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : allQuestionsAnswered || Object.keys(answers).length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Assessment</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentInterface;