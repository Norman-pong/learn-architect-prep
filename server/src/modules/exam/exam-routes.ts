import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getConfigs, startExam, pauseExam, resumeExam, finishExam, getActiveExam } from "./exam-service";

const ErrorResponse = t.Object({ error: t.String() });

const ExamTypeLiteral = t.Union([
  t.Literal("comprehensive"),
  t.Literal("case"),
  t.Literal("essay"),
  t.Literal("full"),
]);

const ExamModeLiteral = t.Union([t.Literal("single"), t.Literal("full")]);

const ConfigResponse = t.Array(
  t.Object({
    examType: t.String(),
    questionCount: t.Number(),
    duration: t.Number(),
    chooseCount: t.Optional(t.Number()),
  }),
);

const StartBody = t.Object({
  examType: ExamTypeLiteral,
  mode: ExamModeLiteral,
});

const StartResponse = t.Object({
  id: t.String(),
  examType: t.String(),
  mode: t.String(),
  status: t.String(),
  duration: t.Number(),
  remainingTime: t.Number(),
  answersSnapshot: t.Unknown(),
  startedAt: t.String(),
});

const PauseBody = t.Object({
  examId: t.String(),
  remainingTime: t.Number(),
  answersSnapshot: t.Record(t.String(), t.Unknown()),
});

const PauseResponse = t.Object({
  id: t.String(),
  status: t.String(),
  remainingTime: t.Number(),
  answersSnapshot: t.Unknown(),
});

const ResumeBody = t.Object({
  examId: t.String(),
});

const ResumeResponse = t.Object({
  id: t.String(),
  examType: t.String(),
  mode: t.String(),
  status: t.String(),
  duration: t.Number(),
  remainingTime: t.Number(),
  answersSnapshot: t.Unknown(),
  startedAt: t.String(),
});

const FinishBody = t.Object({
  examId: t.String(),
  answersSnapshot: t.Optional(t.Record(t.String(), t.Unknown())),
  score: t.Optional(t.Number()),
});

const FinishResponse = t.Object({
  id: t.String(),
  status: t.String(),
  score: t.Nullable(t.Number()),
  finishedAt: t.String(),
});

const StatusResponse = t.Object({
  active: t.Nullable(
    t.Object({
      id: t.String(),
      examType: t.String(),
      mode: t.String(),
      status: t.String(),
      duration: t.Number(),
      remainingTime: t.Number(),
      answersSnapshot: t.Unknown(),
      startedAt: t.String(),
    }),
  ),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const examRoutes = new Elysia({ prefix: "/api/exam" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await requireUserId(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return undefined;
  })
  .derive(async ({ headers }) => {
    const userId = await requireUserId(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/config",
    async () => {
      return getConfigs();
    },
    {
      response: { 200: ConfigResponse, 401: ErrorResponse },
    },
  )
  .post(
    "/start",
    async ({ body, userId }) => {
      const record = await startExam(userId, body.examType, body.mode);
      return {
        id: record.id,
        examType: record.examType,
        mode: record.mode,
        status: record.status,
        duration: record.duration,
        remainingTime: record.remainingTime,
        answersSnapshot: record.answersSnapshot,
        startedAt: record.startedAt,
      };
    },
    {
      body: StartBody,
      response: { 200: StartResponse, 401: ErrorResponse },
    },
  )
  .post(
    "/pause",
    async ({ body, userId }) => {
      const record = await pauseExam(userId, body.examId, body.remainingTime, body.answersSnapshot);
      if (!record) {
        return { error: "Exam not found or not in progress" };
      }
      return {
        id: record.id,
        status: record.status,
        remainingTime: record.remainingTime,
        answersSnapshot: record.answersSnapshot,
      };
    },
    {
      body: PauseBody,
      response: { 200: PauseResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .post(
    "/resume",
    async ({ body, userId }) => {
      const record = await resumeExam(userId, body.examId);
      if (!record) {
        return { error: "Exam not found or not in progress" };
      }
      return {
        id: record.id,
        examType: record.examType,
        mode: record.mode,
        status: record.status,
        duration: record.duration,
        remainingTime: record.remainingTime,
        answersSnapshot: record.answersSnapshot,
        startedAt: record.startedAt,
      };
    },
    {
      body: ResumeBody,
      response: { 200: ResumeResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .post(
    "/finish",
    async ({ body, userId }) => {
      const record = await finishExam(userId, body.examId, body.answersSnapshot, body.score);
      if (!record) {
        return { error: "Exam not found or not in progress" };
      }
      return {
        id: record.id,
        status: record.status,
        score: record.score,
        finishedAt: record.finishedAt ?? new Date().toISOString(),
      };
    },
    {
      body: FinishBody,
      response: { 200: FinishResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .get(
    "/status",
    async ({ userId }) => {
      const record = await getActiveExam(userId);
      return {
        active: record
          ? {
              id: record.id,
              examType: record.examType,
              mode: record.mode,
              status: record.status,
              duration: record.duration,
              remainingTime: record.remainingTime,
              answersSnapshot: record.answersSnapshot,
              startedAt: record.startedAt,
            }
          : null,
      };
    },
    {
      response: { 200: StatusResponse, 401: ErrorResponse },
    },
  );

export default examRoutes;
