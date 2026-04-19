const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// Quiz
export interface QuizQuestion {
  id: number;
  code: string;
  textIt: string;
  textAr: string;
  imageUrl: string | null;
  chapterId: number;
}

export interface QuizStart {
  attemptId: number;
  startedAt: string;
  timeLimitSeconds: number | null;
  questions: QuizQuestion[];
}

export interface QuizResult {
  attemptId: number;
  mode: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  passed: boolean | null;
  durationSeconds: number;
  maxErrorsToPass: number | null;
  details: Array<{
    questionId: number;
    userAnswer: boolean | null;
    correctAnswer: boolean;
    isCorrect: boolean;
    explanationIt: string;
    explanationAr: string;
  }>;
}

export function startExam() {
  return fetchApi<QuizStart>('/quiz/exam', { method: 'POST' });
}

export function startPractice(opts: { topicKey?: string; chapterId?: number; count?: number }) {
  return fetchApi<QuizStart>('/quiz/practice', { method: 'POST', body: JSON.stringify(opts) });
}

export function submitQuiz(attemptId: number, answers: Array<{ questionId: number; answer: boolean }>) {
  return fetchApi<QuizResult>('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ attemptId, answers }),
  });
}

export function getQuizResult(id: number) {
  return fetchApi<any>(`/quiz/${id}`);
}

// Chapters
export interface Chapter {
  id: number;
  number: number;
  nameIt: string;
  nameAr: string;
  coverImageUrl: string | null;
  ministryWeight: number;
}

export function getChapters() {
  return fetchApi<Chapter[]>('/chapters');
}

// Topics
export interface Topic {
  id: number;
  topicKey: string;
  titleIt: string;
  titleAr: string;
  contentIt: string;
  contentAr: string;
  imageUrl: string | null;
  chapterId: number;
  questionCount: number;
}

export function getTopics(chapterId?: number) {
  const params = chapterId ? `?chapterId=${chapterId}` : '';
  return fetchApi<Topic[]>(`/topics${params}`);
}

// Questions
export interface Question {
  id: number;
  code: string;
  textIt: string;
  textAr: string;
  explanationIt: string;
  explanationAr: string;
  isTrue: boolean;
  imageUrl: string | null;
  chapterId: number;
  topicKey: string;
}

// Glossary
export interface GlossaryTerm {
  id: number;
  termIt: string;
  termAr: string;
  definitionIt: string;
  definitionAr: string;
  category: string;
}

export function getGlossary() {
  return fetchApi<GlossaryTerm[]>('/glossary');
}

// Lessons
export interface Lesson {
  id: string;
  chapterId: number;
  titleIt: string;
  titleAr: string;
  contentIt: string;
  contentAr: string;
  sortOrder: number;
}

export function getLessons(chapterId?: number) {
  const params = chapterId ? `?chapterId=${chapterId}` : '';
  return fetchApi<Lesson[]>(`/lessons${params}`);
}

export function getLesson(id: string) {
  return fetchApi<Lesson & { topics: Topic[] }>(`/lessons/${id}`);
}

// Progress
export interface DashboardStats {
  totalAnswered: number;
  totalCorrect: number;
  uniqueQuestions: number;
  accuracy: number;
  totalExams: number;
  passedExams: number;
  avgScore: number;
  streak: number;
  recentActivity: Array<{
    date: string;
    questionsAnswered: number;
    questionsCorrect: number;
    quizCount: number;
    studyMinutes: number;
  }>;
}

export interface ChapterProgress {
  id: number;
  number: number;
  nameIt: string;
  nameAr: string;
  totalQuestions: number;
  answeredCorrectly: number;
  percentage: number;
}

export function getDashboard(token: string) {
  return fetchApi<DashboardStats>('/progress/dashboard', {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function getChapterProgress(token: string) {
  return fetchApi<ChapterProgress[]>('/progress/chapters', {
    headers: { authorization: `Bearer ${token}` },
  });
}

// Tricks
export interface TopicTricks {
  topicKey: string;
  truePatternsIT: string;
  truePatternsAR: string;
  falsePatternsIT: string;
  falsePatternsAR: string;
  memoryRuleIT?: string;
  memoryRuleAR?: string;
  commonMistakeIT?: string;
  commonMistakeAR?: string;
}

export function getTricks(topicKey: string) {
  return fetchApi<TopicTricks>(`/tricks/${topicKey}`);
}

export interface KeywordHint {
  word: string;
  count: number;
  examples: string[];
}

export function getKeywordHints() {
  return fetchApi<{
    onlyTrue: KeywordHint[];
    onlyFalse: KeywordHint[];
    mostlyTrue: KeywordHint[];
    mostlyFalse: KeywordHint[];
  }>('/keywords');
}

// Confusing pairs
export interface ConfusingPair {
  similarity: number;
  topicKey: string;
  trueQuestion: { code: string; textIT: string; textAR: string };
  falseQuestion: { code: string; textIT: string; textAR: string };
}

export function getConfusingPairs(opts?: { topicKey?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.topicKey) params.set('topicKey', opts.topicKey);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  return fetchApi<{ data: ConfusingPair[]; total: number }>(`/confusing-pairs?${params}`);
}

export function getQuestions(opts: { chapterId?: number; topicKey?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts.chapterId) params.set('chapterId', String(opts.chapterId));
  if (opts.topicKey) params.set('topicKey', opts.topicKey);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  return fetchApi<{ data: Question[]; total: number; limit: number; offset: number }>(`/questions?${params}`);
}
