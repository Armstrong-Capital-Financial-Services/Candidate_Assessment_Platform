import React, { useState, useEffect } from 'react';
import { PlusCircle, Users, FileSpreadsheet, Trash2, Save, Clock, Plus, CheckCircle2, Download } from 'lucide-react';
import { useQuestionStore, QuestionType } from '../store/questionStore';
import { useTestStore, Test } from '../store/testStore';
import { supabase } from '../lib/supabase'; 

interface Candidate {
  id: number;
  name: string;
  completionTime: string;
  tabSwitches: number;
  status: 'completed' | 'in-progress' | 'not-started';
  questionsAttempted?: number;
  totalQuestions?: number;
  timeTaken?: string;
  question_answer_pairs?: any[];
  score?: number;
  totalScore?: number;
}

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'MCQ', label: 'Multiple Choice' },
  { value: 'LONG_ANSWER', label: 'Long Answer' },
  { value: 'ONE_WORD', label: 'One Word' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
];

function AdminDashboard() {
  const { questions, addQuestion, removeQuestion, clearQuestions } = useQuestionStore();
  const { tests, addTest, updateTest, removeTest, currentTest, setCurrentTest, setActiveTest, activeTest } = useTestStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'MCQ' as QuestionType,
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    duration: 45,
    questions: [] as typeof questions
  });

  const calculateScore = (questionAnswerPairs: any[], testQuestions: typeof questions) => {
    if (!questionAnswerPairs || !testQuestions) return { score: 0, total: 0 };

    let score = 0;
    const total = testQuestions.filter(q => q.type === 'MCQ').length;

    questionAnswerPairs.forEach((pair: any) => {
      const question = testQuestions.find(q => q.id === pair.id);
      if (question && question.type === 'MCQ') {
        if (question.correctAnswer === pair.answer) {
          score += 1;
        }
      }
    });

    return { score, total };
  };

  // Fetch candidates from Supabase
  useEffect(() => {
    async function fetchCandidates() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('candidate_responses')
          .select('*');

        if (error) {
          throw error;
        }

        if (data) {
          const formattedData: Candidate[] = data.map(item => {
            const activeTest = tests.find(t => t.isActive);
            let scoreInfo = { score: 0, total: 0 };
            
            if (activeTest && item.question_answer_pairs) {
              scoreInfo = calculateScore(item.question_answer_pairs, activeTest.questions);
            }

            return {
              id: item.id,
              name: item.candidate_name,
              tabSwitches: item.tab_switches || 0,
              status: item.completion_status || 'not-started',
              questionsAttempted: item.questions_attempted,
              totalQuestions: item.total_questions,
              timeTaken: item.time_taken || '--:--',
              question_answer_pairs: item.question_answer_pairs,
              score: scoreInfo.score,
              totalScore: scoreInfo.total
            };
          });
          setCandidates(formattedData);
        }
      } catch (err) {
        setError('Failed to fetch candidates');
        console.error('Error fetching candidates:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidates();
  }, [tests]);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const questionData = {
      question: newQuestion.question,
      type: newQuestion.type,
      ...(newQuestion.type === 'MCQ' && {
        options: newQuestion.options,
        correctAnswer: newQuestion.correctAnswer
      })
    };
    addQuestion(questionData);
    setNewQuestion({ question: '', type: 'MCQ', options: ['', '', '', ''], correctAnswer: 0 });
    setShowQuestionForm(false);
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    setNewQuestion(prev => ({
      ...prev,
      type,
      ...(type === 'MCQ' ? { options: ['', '', '', ''], correctAnswer: 0 } : {})
    }));
  };

  const handleSaveTest = () => {
    if (currentTest) {
      updateTest(currentTest.id, { ...currentTest, questions });
    } else {
      addTest({ ...newTest, questions });
      setNewTest({ name: '', description: '', duration: 45, questions: [] });
    }
    clearQuestions();
    setCurrentTest(null);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    addTest(newTest);
    setNewTest({ name: '', description: '', duration: 45, questions: [] });
    setShowTestForm(false);
  };

  const handleLoadTest = (test: Test) => {
    setCurrentTest(test);
    clearQuestions();
    test.questions.forEach(addQuestion);
  };

  const handleSetActiveTest = (test: Test) => {
    setActiveTest(activeTest?.id === test.id ? null : test);
  };

  const downloadCandidatesCSV = () => {
    let csvContent = "ID,Name,Status,Score,Time Taken,Tab Switches,Questions Attempted,Total Questions,Answers\n";

    candidates.forEach(candidate => {
      const formattedAnswers = Array.isArray(candidate.question_answer_pairs)
        ? candidate.question_answer_pairs.map((qa: any) => {
            let ansValue = '';

            if (qa.answer && typeof qa.answer === 'object' && 'fileUrl' in qa.answer) {
              ansValue = qa.answer.fileUrl;
            } else {
              ansValue = qa.answer;
            }

            return `"${qa.question}: ${ansValue}"`;
          }).join(' | ')
        : '';

      const row = [
        candidate.id,
        candidate.name,
        candidate.status,
        candidate.score !== undefined && candidate.totalScore !== undefined 
          ? `${candidate.score}/${candidate.totalScore}` 
          : 'N/A',
        candidate.timeTaken || '--:--',
        candidate.tabSwitches,
        candidate.questionsAttempted || 0,
        candidate.totalQuestions || 0,
        formattedAnswers
      ].join(',');

      csvContent += row + "\n";
    });
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'candidates.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowTestForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Test</span>
              </button>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center space-x-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Tests Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold">Tests</h2>
              </div>
              {questions.length > 0 && (
                <button
                  onClick={handleSaveTest}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{currentTest ? 'Update Test' : 'Save as New Test'}</span>
                </button>
              )}
            </div>
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <p className="text-sm text-gray-500">{test.description}</p>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Duration: {test.duration} minutes</span>
                        <span className="mx-2">•</span>
                        <span className="text-gray-600">{test.questions.length} questions</span>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleSetActiveTest(test)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition ${
                          test.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{test.isActive ? 'Active' : 'Set Active'}</span>
                      </button>
                      <button
                        onClick={() => handleLoadTest(test)}
                        className="text-indigo-600 hover:text-indigo-800 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeTest(test.id)}
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Questions Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold">
                {currentTest ? `Questions for ${currentTest.name}` : 'Questions'}
              </h2>
            </div>
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">Question {index + 1}</div>
                      <p className="text-gray-600 mt-1">{q.question}</p>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                          {questionTypes.find(type => type.value === q.type)?.label}
                        </span>
                      </div>
                      {q.type === 'MCQ' && q.options && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((option, i) => (
                            <div key={i} className="text-sm text-gray-600">
                              {i === q.correctAnswer && '✓ '}{option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-red-600 hover:text-red-800 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No questions added yet</p>
              )}
            </div>
          </div>

          {/* Candidates Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold">Candidates</h2>
              </div>
              <button
                onClick={downloadCandidatesCSV}
                disabled={loading || candidates.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  loading || candidates.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Loading candidates...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-indigo-600 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {candidates.length > 0 ? (
                  candidates.map((candidate) => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-sm ${
                          candidate.status === 'completed' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {candidate.status}
                        </div>
                      </div>
                      {candidate.status === 'completed' && (
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Score</div>
                            <div className="font-medium">
                              {candidate.score !== undefined && candidate.totalScore !== undefined 
                                ? `${candidate.score} / ${candidate.totalScore}` 
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Tab Switches</div>
                            <div className="font-medium">{candidate.tabSwitches}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Time Taken</div>
                            <div className="font-medium">{candidate.timeTaken || '--:--'}</div>
                          </div>
                        </div>
                      )}
                      {candidate.status === 'completed' && candidate.questionsAttempted !== undefined && candidate.totalQuestions !== undefined && (
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Questions Attempted</div>
                            <div className="font-medium">{candidate.questionsAttempted} / {candidate.totalQuestions}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No candidates found</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add Question Modal */}
      {showQuestionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Question</h3>
            <form onSubmit={handleAddQuestion}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Question Type</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newQuestion.type}
                    onChange={(e) => handleQuestionTypeChange(e.target.value as QuestionType)}
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Question</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    required
                  />
                </div>

                {newQuestion.type === 'MCQ' && (
                  <>
                    {newQuestion.options.map((option, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700">
                          Option {index + 1}
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestion.options];
                            newOptions[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                          required
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        value={newQuestion.correctAnswer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: Number(e.target.value) })}
                        required
                      >
                        {newQuestion.options.map((_, index) => (
                          <option key={index} value={index}>Option {index + 1}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionForm(false)}
                  className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {showTestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Test</h3>
            <form onSubmit={handleCreateTest}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Test Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newTest.description}
                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newTest.duration}
                    onChange={(e) => setNewTest({ ...newTest, duration: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTestForm(false)}
                  className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;