const API_BASE = '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
  isTrue?: boolean;
  explanationIt?: string;
  explanationAr?: string;
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

let topicsCache: { data: Topic[]; ts: number } | null = null;
const TOPICS_CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getTopics(chapterId?: number) {
  if (!chapterId && topicsCache && Date.now() - topicsCache.ts < TOPICS_CACHE_TTL) {
    return topicsCache.data;
  }
  const params = chapterId ? `?chapterId=${chapterId}` : '';
  const data = await fetchApi<Topic[]>(`/topics${params}`);
  if (!chapterId) topicsCache = { data, ts: Date.now() };
  return data;
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

export interface TopicStat {
  topicKey: string;
  titleIt: string;
  titleAr: string;
  chapterId: number;
  totalSeen: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
}

export function getTopicStats(token: string) {
  return fetchApi<TopicStat[]>('/progress/topics', {
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

// Review (SM-2 due questions)
export interface ReviewQuestion {
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
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  timesCorrect: number;
  timesWrong: number;
}

export function getReviewQuestions(token: string, limit = 20) {
  return fetchApi<ReviewQuestion[]>(`/progress/review?limit=${limit}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function getWeakQuestions(token: string, limit = 20) {
  return fetchApi<ReviewQuestion[]>(`/progress/weak?limit=${limit}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

// Profile
export interface UserProfile {
  id: number;
  email: string;
  role: string;
  nameIt: string;
  nameAr: string;
  createdAt: string;
  subscription: { expiresAt: string; durationMinutes: number } | null;
}

export function getProfile(token: string) {
  return fetchApi<UserProfile>('/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function updateProfile(token: string, data: { nameIt?: string; nameAr?: string; password?: string }) {
  return fetchApi<{ message: string; user: { id: number; email: string; role: string; nameIt: string; nameAr: string } }>('/auth/profile', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

// Admin
export interface AdminStats {
  questions: number;
  topics: number;
  chapters: number;
  users: number;
  quizAttempts: number;
}

export function getAdminStats(token: string) {
  return fetchApi<AdminStats>('/admin/stats', {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function createQuestion(token: string, data: Omit<Question, 'id'>) {
  return fetchApi<Question>('/admin/questions', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function updateQuestion(token: string, id: number, data: Partial<Question>) {
  return fetchApi<Question>(`/admin/questions/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function deleteQuestion(token: string, id: number) {
  return fetchApi<{ message: string; id: number }>(`/admin/questions/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
}

export function createTopic(token: string, data: Partial<Topic>) {
  return fetchApi<Topic>('/admin/topics', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function updateTopic(token: string, id: number, data: Partial<Topic>) {
  return fetchApi<Topic>(`/admin/topics/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export function deleteTopic(token: string, id: number) {
  return fetchApi<{ message: string; id: number }>(`/admin/topics/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
}

export function getQuestions(opts: { chapterId?: number; topicKey?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts.chapterId) params.set('chapterId', String(opts.chapterId));
  if (opts.topicKey) params.set('topicKey', opts.topicKey);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  return fetchApi<{ data: Question[]; total: number; limit: number; offset: number }>(`/questions?${params}`);
}
