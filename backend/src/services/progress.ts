import { eq, and, sql, desc } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { userProgress, userDailyActivity } from '../db/schema/user-progress.js';
import { userQuestionStats } from '../db/schema/user-question-stats.js';
import { quizAttempts } from '../db/schema/quiz-attempts.js';
import { topics } from '../db/schema/topics.js';
import { chapters } from '../db/schema/chapters.js';

export class ProgressService {
  constructor(private db: Database) {}

  /**
   * Update daily activity after quiz submission
   */
  async recordActivity(userId: number, questionsAnswered: number, questionsCorrect: number, durationSeconds: number) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [existing] = await this.db.select()
      .from(userDailyActivity)
      .where(and(
        eq(userDailyActivity.userId, userId),
        eq(userDailyActivity.date, today),
      ));

    if (existing) {
      await this.db.update(userDailyActivity)
        .set({
          questionsAnswered: existing.questionsAnswered + questionsAnswered,
          questionsCorrect: existing.questionsCorrect + questionsCorrect,
          quizCount: existing.quizCount + 1,
          studyMinutes: existing.studyMinutes + Math.round(durationSeconds / 60),
        })
        .where(eq(userDailyActivity.id, existing.id));
    } else {
      await this.db.insert(userDailyActivity).values({
        userId,
        date: today,
        questionsAnswered,
        questionsCorrect,
        quizCount: 1,
        studyMinutes: Math.round(durationSeconds / 60),
      });
    }
  }

  /**
   * Get user dashboard stats
   */
  async getDashboard(userId: number) {
    // Total stats from question stats
    const [totalStats] = await this.db.select({
      totalAnswered: sql<number>`COALESCE(SUM(${userQuestionStats.timesCorrect} + ${userQuestionStats.timesWrong}), 0)`,
      totalCorrect: sql<number>`COALESCE(SUM(${userQuestionStats.timesCorrect}), 0)`,
      uniqueQuestions: sql<number>`COUNT(*)`,
    })
      .from(userQuestionStats)
      .where(eq(userQuestionStats.userId, userId));

    // Quiz attempts
    const [quizStats] = await this.db.select({
      totalExams: sql<number>`COUNT(*) FILTER (WHERE ${quizAttempts.mode} = 'exam' AND ${quizAttempts.submittedAt} IS NOT NULL)`,
      passedExams: sql<number>`COUNT(*) FILTER (WHERE ${quizAttempts.passed} = true)`,
      avgScore: sql<number>`COALESCE(AVG(${quizAttempts.score}) FILTER (WHERE ${quizAttempts.submittedAt} IS NOT NULL), 0)`,
    })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId));

    // Streak calculation
    const streak = await this.calculateStreak(userId);

    // Recent activity (last 7 days)
    const recentActivity = await this.db.select()
      .from(userDailyActivity)
      .where(eq(userDailyActivity.userId, userId))
      .orderBy(desc(userDailyActivity.date))
      .limit(7);

    return {
      totalAnswered: Number(totalStats.totalAnswered),
      totalCorrect: Number(totalStats.totalCorrect),
      uniqueQuestions: Number(totalStats.uniqueQuestions),
      accuracy: totalStats.totalAnswered > 0
        ? Math.round((Number(totalStats.totalCorrect) / Number(totalStats.totalAnswered)) * 100)
        : 0,
      totalExams: Number(quizStats.totalExams),
      passedExams: Number(quizStats.passedExams),
      avgScore: Math.round(Number(quizStats.avgScore)),
      streak,
      recentActivity,
    };
  }

  /**
   * Get progress per chapter
   */
  async getChapterProgress(userId: number) {
    // Simple approach: get chapters + question counts, then stats separately
    const chapterList = await this.db.select({
      id: chapters.id,
      number: chapters.number,
      nameIt: chapters.nameIt,
      nameAr: chapters.nameAr,
    }).from(chapters).orderBy(chapters.number);

    // Get question counts per chapter
    const qCounts = await this.db.select({
      chapterId: sql<number>`chapter_id`,
      cnt: sql<number>`count(*)`,
    }).from(sql`questions`).groupBy(sql`chapter_id`);

    const countMap = new Map(qCounts.map(r => [Number(r.chapterId), Number(r.cnt)]));

    // Get correctly answered question counts per chapter for this user
    const correctCounts = await this.db.execute(sql`
      SELECT q.chapter_id, count(DISTINCT uqs.question_id) as cnt
      FROM user_question_stats uqs
      JOIN questions q ON q.id = uqs.question_id
      WHERE uqs.user_id = ${userId} AND uqs.times_correct > 0
      GROUP BY q.chapter_id
    `) as { chapter_id: number; cnt: string }[];

    const correctMap = new Map(
      (correctCounts as any[]).map((r: any) => [Number(r.chapter_id), Number(r.cnt)])
    );

    return chapterList.map(ch => {
      const total = countMap.get(ch.id) || 0;
      const correct = correctMap.get(ch.id) || 0;
      return {
        ...ch,
        totalQuestions: total,
        answeredCorrectly: correct,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });
  }

  /**
   * Get per-topic accuracy stats for a user
   */
  async getTopicStats(userId: number) {
    const rows = await this.db.execute(sql`
      SELECT
        q.topic_key,
        t.title_it,
        t.title_ar,
        t.chapter_id,
        COUNT(*) as total_seen,
        SUM(uqs.times_correct) as total_correct,
        SUM(uqs.times_wrong) as total_wrong,
        ROUND(
          SUM(uqs.times_correct)::numeric /
          GREATEST(SUM(uqs.times_correct + uqs.times_wrong), 1) * 100
        ) as accuracy
      FROM user_question_stats uqs
      JOIN questions q ON q.id = uqs.question_id
      LEFT JOIN topics t ON t.topic_key = q.topic_key
      WHERE uqs.user_id = ${userId}
      GROUP BY q.topic_key, t.title_it, t.title_ar, t.chapter_id
      ORDER BY accuracy ASC, total_seen DESC
    `);

    return (rows as any[]).map((r: any) => ({
      topicKey: r.topic_key,
      titleIt: r.title_it || r.topic_key,
      titleAr: r.title_ar || '',
      chapterId: Number(r.chapter_id),
      totalSeen: Number(r.total_seen),
      totalCorrect: Number(r.total_correct),
      totalWrong: Number(r.total_wrong),
      accuracy: Number(r.accuracy),
    }));
  }

  /**
   * Calculate current streak (consecutive days with activity)
   */
  private async calculateStreak(userId: number): Promise<number> {
    const activities = await this.db.select({ date: userDailyActivity.date })
      .from(userDailyActivity)
      .where(eq(userDailyActivity.userId, userId))
      .orderBy(desc(userDailyActivity.date))
      .limit(365);

    if (activities.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = today;

    for (const { date } of activities) {
      if (date === checkDate) {
        streak++;
        // Go to previous day
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else if (date < checkDate) {
        // Gap found — if first day and it's not today, check yesterday
        if (streak === 0 && date === getPreviousDay(today)) {
          streak = 1;
          const d = new Date(date);
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
        } else {
          break;
        }
      }
    }

    return streak;
  }
}

function getPreviousDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
