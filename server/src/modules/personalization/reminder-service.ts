import { getDb } from "../../db";
import { sendEmail } from "../auth/email";
import { getDueCards } from "../../services/sm2";

interface UserReminder {
  id: string;
  email: string;
  reminderEnabled: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildReminderEmail(
  userEmail: string,
  dueCount: number,
  titles: string[],
): { subject: string; html: string } {
  const subject = `【ArchPrep】今日有 ${dueCount} 张复习卡片到期`;

  const titleList =
    titles.length > 0
      ? titles.map((t) => `<li>${t}</li>`).join("")
      : "<li>（无具体知识点标题）</li>";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { background: #1677ff; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; }
    .content { background: #f6f8fa; padding: 24px; border-radius: 0 0 8px 8px; }
    .count { font-size: 32px; font-weight: bold; color: #1677ff; }
    .list { background: white; padding: 16px; border-radius: 6px; margin-top: 16px; }
    .list ul { margin: 0; padding-left: 20px; }
    .list li { margin: 8px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0">ArchPrep 学习提醒</h2>
    </div>
    <div class="content">
      <p>您好，</p>
      <p>今日（${todayIso()}）共有 <span class="count">${dueCount}</span> 张复习卡片到期，请及时复习以保持记忆效果。</p>
      <div class="list">
        <strong>到期知识点：</strong>
        <ul>
          ${titleList}
        </ul>
      </div>
      <p style="margin-top:24px">坚持复习，考试必胜！</p>
    </div>
    <div class="footer">
      <p>ArchPrep 系统架构设计师备考系统</p>
      <p>如不想接收提醒，请在设置中关闭学习提醒。</p>
    </div>
  </div>
</body>
</html>
`;

  return { subject, html };
}

export async function checkAndSendReminders(): Promise<{ sent: number; failed: number }> {
  const db = getDb();
  const today = todayIso();

  const users = db
    .query<UserReminder, []>(
      `SELECT id, email, reminder_enabled AS reminderEnabled FROM users WHERE reminder_enabled = 1;`,
    )
    .all();

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const dueCards = getDueCards(user.id, 50);
      if (dueCards.length === 0) continue;

      const titles: string[] = [];
      for (const card of dueCards.slice(0, 10)) {
        const match = card.knowledgePointId.match(/^kp-(\d{2})-(\d{2})$/);
        if (match) {
          const chapterNum = match[1];
          const kpNum = match[2];
          titles.push(`第${parseInt(chapterNum, 10)}章 - 知识点 ${kpNum}`);
        } else {
          titles.push(card.knowledgePointId);
        }
      }
      if (dueCards.length > 10) {
        titles.push(`...还有 ${dueCards.length - 10} 个知识点`);
      }

      const { subject, html } = buildReminderEmail(user.email, dueCards.length, titles);
      await sendEmail(user.email, subject, html);
      sent += 1;
    } catch (err) {
      console.error(`[Reminder] Failed to send reminder to ${user.email}:`, err);
      failed += 1;
    }
  }

  console.log(`[Reminder] ${today} — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}

export function getReminderStatus(userId: string): { enabled: boolean } {
  const db = getDb();
  const row = db
    .query<{ reminderEnabled: number }, [string]>(
      `SELECT reminder_enabled AS reminderEnabled FROM users WHERE id = ?;`,
    )
    .get(userId);
  return { enabled: row ? row.reminderEnabled === 1 : false };
}

export function toggleReminder(userId: string): { enabled: boolean } {
  const db = getDb();
  const row = db
    .query<{ reminderEnabled: number }, [string]>(
      `SELECT reminder_enabled AS reminderEnabled FROM users WHERE id = ?;`,
    )
    .get(userId);

  const newEnabled = row ? (row.reminderEnabled === 1 ? 0 : 1) : 1;
  db.run(`UPDATE users SET reminder_enabled = ? WHERE id = ?;`, [newEnabled, userId]);
  return { enabled: newEnabled === 1 };
}
