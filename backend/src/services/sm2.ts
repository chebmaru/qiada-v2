import { eq, and, sql, lte } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { userQuestionStats } from '../db/schema/user-question-stats.js';
import { questions } from '../db/schema/questions.js';

// SM-2 algorithm constants
const MIN_EASE = 1.3;

interface ReviewResult {
  questionId: number;
  correct: boolean;
}

export class SM2Service {
  constructor(private db: Database) {}

  /**
   * Process quiz results and update SM-2 stats for each question
   */
  async processResults(userId: number, results: ReviewResult[]) {
    for (const { questionId, correct } of results) {
      const [existing] = await this.db.select()
        .from(userQuestionStats)
        .where(and(
          eq(userQuestionStats.userId, userId),
          eq(userQuestionStats.questionId, questionId),
        ));

      const quality = correct ? 4 : 1; // SM-2 quality: 0-5
      const now = new Date();

      if (existing) {
        const { easeFactor, interval, repetitions } = this.calculateSM2(
          existing.easeFactor,
          existing.interval,
          existing.repetitions,
          quality,
        );

        const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

        await this.db.update(userQuestionStats)
          .set({
            easeFactor,
            interval,
            repetitions,
            nextReviewAt,
            timesCorrect: correct ? existing.timesCorrect + 1 : existing.timesCorrect,
            timesWrong: correct ? existing.timesWrong : existing.timesWrong + 1,
            lastAnsweredAt: now,
            updatedAt: now,
          })
          .where(eq(userQuestionStats.id, existing.id));
      } else {
        const { easeFactor, interval, repetitions } = this.calculateSM2(2.5, 0, 0, quality);
        const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

        await this.db.insert(userQuestionStats).values({
          userId,
          questionId,
          easeFactor,
          interval,
          repetitions,
          nextReviewAt,
          timesCorrect: correct ? 1 : 0,
          timesWrong: correct ? 0 : 1,
          lastAnsweredAt: now,
        });
      }
    }
  }

  /**
   * Get questions due for review (SM-2 scheduling)
   */
  async getDueQuestions(userId: number, limit = 20) {
    const now = new Date();

    return this.db.select({
      questionId: userQuestionStats.questionId,
      code: questions.code,
      textIt: questions.textIt,
      textAr: questions.textAr,
      imageUrl: questions.imageUrl,
      chapterId: questions.chapterId,
      easeFactor: userQuestionStats.easeFactor,
      interval: userQuestionStats.interval,
      nextReviewAt: userQuestionStats.nextReviewAt,
    })
      .from(userQuestionStats)
      .innerJoin(questions, eq(userQuestionStats.questionId, questions.id))
      .where(and(
        eq(userQuestionStats.userId, userId),
        lte(userQuestionStats.nextReviewAt, now),
      ))
      .orderBy(userQuestionStats.nextReviewAt)
      .limit(limit);
  }

  /**
   * Get user's weakest questions (most errors)
   */
  async getWeakQuestions(userId: number, limit = 20) {
    return this.db.select({
      questionId: userQuestionStats.questionId,
      code: questions.code,
      textIt: questions.textIt,
      textAr: questions.textAr,
      imageUrl: questions.imageUrl,
      timesCorrect: userQuestionStats.timesCorrect,
      timesWrong: userQuestionStats.timesWrong,
      easeFactor: userQuestionStats.easeFactor,
    })
      .from(userQuestionStats)
      .innerJoin(questions, eq(userQuestionStats.questionId, questions.id))
      .where(eq(userQuestionStats.userId, userId))
      .orderBy(sql`${userQuestionStats.timesWrong}::float / GREATEST(${userQuestionStats.timesCorrect} + ${userQuestionStats.timesWrong}, 1) DESC`)
      .limit(limit);
  }

  /**
   * SM-2 algorithm implementation
   */
  private calculateSM2(
    prevEase: number,
    prevInterval: number,
    prevReps: number,
    quality: number, // 0-5
  ): { easeFactor: number; interval: number; repetitions: number } {
    let easeFactor = prevEase;
    let interval: number;
    let repetitions: number;

    if (quality >= 3) {
      // Correct answer
      if (prevReps === 0) {
        interval = 1;
      } else if (prevReps === 1) {
        interval = 6;
      } else {
        interval = Math.round(prevInterval * easeFactor);
      }
      repetitions = prevReps + 1;
    } else {
      // Wrong answer — reset
      repetitions = 0;
      interval = 1;
    }

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;

    return { easeFactor, interval, repetitions };
  }
}
