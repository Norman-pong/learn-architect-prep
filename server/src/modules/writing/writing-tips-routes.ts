import { Elysia } from "elysia";
import path from "node:path";
import { DATA_DIR } from "../../config/paths";

const TIPS_DIR = path.join(DATA_DIR, "writing/tips");

async function readJson(fileName: string) {
  const file = Bun.file(path.join(TIPS_DIR, fileName));
  if (!(await file.exists())) {
    return null;
  }
  return file.json();
}

export const writingTipsRoutes = new Elysia({ prefix: "/api/writing-tips" })
  .get("/", async ({ set }) => {
    const data = await readJson("writing-tips.json");
    if (!data) {
      set.status = 404;
      return { error: "写作技巧数据不存在" };
    }
    return data;
  })
  .get("/topics", async ({ set }) => {
    const data = await readJson("year-topics.json");
    if (!data) {
      set.status = 404;
      return { error: "历年题目数据不存在" };
    }
    return data;
  })
  .get("/projects", async ({ set }) => {
    const data = await readJson("master-projects.json");
    if (!data) {
      set.status = 404;
      return { error: "母版项目数据不存在" };
    }
    return data;
  });
