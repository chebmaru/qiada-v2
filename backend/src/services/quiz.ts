import { eq, sql, and, inArray } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { questions } from '../db/schema/questions.js';
import { quizAttempts } from '../db/schema/quiz-attempts.js';
import { chapters } from '../db/schema/chapters.js';

// D.Lgs 59/2011 aggiornato 20/12/2021: 30 domande, 20 minuti, max 3 errori
const EXAM_QUESTIONS = 30;
const EXAM_TIME_SECONDS = 20 * 60;
const MAX_ERRORS_TO_PASS = 3;

interface QuizQuestion {
  id: number;
  code: string;
  textIt: string;
  textAr: string;
  imageUrl: string | null;
  chapterId: number;
}

interface AnswerItem {
  questionId: number;
  answer: boolean;
}

interface SubmitPayload {
  attemptId: number;
  answers: AnswerItem[];
}

export class QuizService {
  constructor(private db: Database) {}

  /**
   * Start a new quiz session (exam mode: 40 random questions weighted by chapter)
   */
  async startExam(userId?: number) {
    // Get questions distributed by chapter weight
    const quizQuestions = await this.getWeightedQuestions(EXAM_QUESTIONS);

    // Create attempt record
    const [attempt] = await this.db.insert(quizAttempts).values({
      userId: userId || null,
      mode: 'exam',
      totalQuestions: quizQuestions.length,
      snapshot: { questionIds: quizQuestions.map(q => q.id) },
    }).returning({ id: quizAttempts.id, startedAt: quizAttempts.startedAt });

    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      timeLimitSeconds: EXAM_TIME_SECONDS,
      questions: quizQuestions,
    };
  }

  /**
   * Start a practice quiz (by topic or chapter, variable count)
   */
  async startPractice(opts: { topicKey?: string; chapterId?: number; count?: number; userId?: number }) {
    const count = Math.min(opts.count || 20, 100);
    const conditions = [];

    if (opts.chapterId) conditions.push(eq(questions.chapterId, opts.chapterId));
    if (opts.topicKey) conditions.push(eq(questions.topicKey, opts.topicKey));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db.select({
      id: questions.id,
      code: questions.code,
      textIt: questions.textIt,
      textAr: questions.textAr,
      imageUrl: questions.imageUrl,
      chapterId: questions.chapterId,
    }).from(questions)
      .where(where)
      .orderBy(sql`random()`)
      .limit(count);

    const [attempt] = await this.db.insert(quizAttempts).values({
      userId: opts.userId || null,
      mode: 'practice',
      totalQuestions: rows.length,
      chapterId: opts.chapterId || null,
      topicKey: opts.topicKey || null,
      snapshot: { questionIds: rows.map(q => q.id) },
    }).returning({ id: quizAttempts.id, startedAt: quizAttempts.startedAt });

    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      timeLimitSeconds: null, // no time limit in practice
      questions: rows,
    };
  }

  /**
   * Submit answers and calculate result
   */
  async submit(payload: SubmitPayload, userId?: number) {
    // Get the attempt
    const [attempt] = await this.db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, payload.attemptId));

    if (!attempt) throw new Error('Attempt not found');
    if (attempt.submittedAt) throw new Error('Already submitted');

    // Ownership check: if attempt has a userId, submitter must match
    if (attempt.userId && userId && attempt.userId !== userId) {
      throw new Error('Not your attempt');
    }

    // Time limit enforcement for exams (30s grace period for network delay)
    if (attempt.mode === 'exam') {
      const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000;
      if (elapsed > EXAM_TIME_SECONDS + 30) {
        throw new Error('Time limit exceeded');
      }
    }

    // Get correct answers for the questions in this attempt
    const questionIds = (attempt.snapshot as { questionIds: number[] }).questionIds;
    const correctAnswers = await this.db.select({
      id: questions.id,
      isTrue: questions.isTrue,
      explanationIt: questions.explanationIt,
      explanationAr: questions.explanationAr,
    }).from(questions)
      .where(inArray(questions.id, questionIds));

    const answerMap = new Map(payload.answers.map(a => [a.questionId, a.answer]));
    const correctMap = new Map(correctAnswers.map(q => [q.id, q]));

    let correctCount = 0;
    let wrongCount = 0;
    const details: Array<{
      questionId: number;
      userAnswer: boolean | null;
      correctAnswer: boolean;
      isCorrect: boolean;
      explanationIt: string;
      explanationAr: string;
    }> = [];

    for (const qId of questionIds) {
      const correct = correctMap.get(qId);
      if (!correct) continue;

      const userAnswer = answerMap.get(qId);
      const isCorrect = userAnswer === correct.isTrue;

      if (isCorrect) correctCount++;
      else wrongCount++;

      details.push({
        questionId: qId,
        userAnswer: userAnswer ?? null,
        correctAnswer: correct.isTrue,
        isCorrect,
        explanationIt: correct.explanationIt || '',
        explanationAr: correct.explanationAr || '',
      });
    }

    const score = Math.round((correctCount / attempt.totalQuestions) * 100);
    const passed = attempt.mode === 'exam' ? wrongCount <= MAX_ERRORS_TO_PASS : null;
    const now = new Date();
    const durationSeconds = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);

    // Update attempt
    await this.db.update(quizAttempts)
      .set({
        correctCount,
        wrongCount,
        score,
        passed,
        durationSeconds,
        submittedAt: now,
        snapshot: { questionIds, answers: payload.answers, details },
      })
      .where(eq(quizAttempts.id, payload.attemptId));

    return {
      attemptId: payload.attemptId,
      mode: attempt.mode,
      totalQuestions: attempt.totalQuestions,
      correctCount,
      wrongCount,
      score,
      passed,
      durationSeconds,
      maxErrorsToPass: attempt.mode === 'exam' ? MAX_ERRORS_TO_PASS : null,
      details,
    };
  }

  /**
   * Get attempt result (for reviewing after submission)
   */
  async getResult(attemptId: number) {
    const [attempt] = await this.db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId));

    if (!attempt) return null;
    return attempt;
  }

  /**
   * Get user's quiz history
   */
  async getHistory(userId: number, limit = 20) {
    return this.db.select({
      id: quizAttempts.id,
      mode: quizAttempts.mode,
      totalQuestions: quizAttempts.totalQuestions,
      correctCount: quizAttempts.correctCount,
      wrongCount: quizAttempts.wrongCount,
      score: quizAttempts.score,
      passed: quizAttempts.passed,
      durationSeconds: quizAttempts.durationSeconds,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt,
    }).from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(sql`${quizAttempts.startedAt} DESC`)
      .limit(limit);
  }

  /**
   * Select questions weighted by chapter ministry weight
   * Chapters with higher weight get more questions
   */
  private async getWeightedQuestions(total: number): Promise<QuizQuestion[]> {
    // Get chapters with their weights
    const chapterRows = await this.db.select({
      id: chapters.id,
      weight: chapters.ministryWeight,
    }).from(chapters);

    const totalWeight = chapterRows.reduce((sum, c) => sum + c.weight, 0);

    // If no weights set, fall back to pure random
    if (totalWeight === 0) {
      return this.db.select({
        id: questions.id,
        code: questions.code,
        textIt: questions.textIt,
        textAr: questions.textAr,
        imageUrl: questions.imageUrl,
        chapterId: questions.chapterId,
      }).from(questions)
        .orderBy(sql`random()`)
        .limit(total);
    }

    // Largest remainder method: guarantees exactly 'total' questions
    const withWeight = chapterRows.filter(c => c.weight > 0);
    if (withWeight.length === 0) {
      return this.db.select({
        id: questions.id,
        code: questions.code,
        textIt: questions.textIt,
        textAr: questions.textAr,
        imageUrl: questions.imageUrl,
        chapterId: questions.chapterId,
      }).from(questions).orderBy(sql`random()`).limit(total);
    }

    const raw = withWeight.map(ch => ({
      chapterId: ch.id,
      exact: (ch.weight / totalWeight) * total,
      count: Math.floor((ch.weight / totalWeight) * total),
    }));

    let allocated = raw.reduce((s, r) => s + r.count, 0);
    // Distribute remainder to chapters with largest fractional parts
    const remainders = raw
      .map((r, i) => ({ i, frac: r.exact - r.count }))
      .sort((a, b) => b.frac - a.frac);

    for (let k = 0; allocated < total && k < remainders.length; k++) {
      raw[remainders[k].i].count++;
      allocated++;
    }

    const allocation = raw.filter(r => r.count > 0).map(r => ({
      chapterId: r.chapterId,
      count: r.count,
    }));

    // Fetch random questions from each chapter
    const allQuestions: QuizQuestion[] = [];
    const usedIds = new Set<number>();

    for (const { chapterId, count } of allocation) {
      const rows = await this.db.select({
        id: questions.id,
        code: questions.code,
        textIt: questions.textIt,
        textAr: questions.textAr,
        imageUrl: questions.imageUrl,
        chapterId: questions.chapterId,
      }).from(questions)
        .where(eq(questions.chapterId, chapterId))
        .orderBy(sql`random()`)
        .limit(count);
      for (const r of rows) usedIds.add(r.id);
      allQuestions.push(...rows);
    }

    // Fill gap if some chapters had fewer questions than allocated
    if (allQuestions.length < total) {
      const gap = total - allQuestions.length;
      const filler = await this.db.select({
        id: questions.id,
        code: questions.code,
        textIt: questions.textIt,
        textAr: questions.textAr,
        imageUrl: questions.imageUrl,
        chapterId: questions.chapterId,
      }).from(questions)
        .orderBy(sql`random()`)
        .limit(gap + usedIds.size); // fetch extra to filter duplicates

      for (const r of filler) {
        if (allQuestions.length >= total) break;
        if (!usedIds.has(r.id)) {
          allQuestions.push(r);
          usedIds.add(r.id);
        }
      }
    }

    // Shuffle the combined array
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    return allQuestions;
  }
}
