import { getWeakPoints } from "./weakness";

export interface Recommendation {
  knowledgePointId: string;
  title: string;
  chapterId: string;
  correctRate: number;
  examWeight: number;
  score: number;
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  const weakPoints = await getWeakPoints(userId);
  const weakOnly = weakPoints.filter((wp) => wp.isWeak);

  const results: Recommendation[] = weakOnly.map((wp) => {
    const score = Math.round((100 - wp.correctRate) * wp.examWeight * 10) / 10;
    return {
      knowledgePointId: wp.chapterId,
      title: wp.chapterName,
      chapterId: wp.chapterId,
      correctRate: wp.correctRate,
      examWeight: wp.examWeight,
      score,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}
