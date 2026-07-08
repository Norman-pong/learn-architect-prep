import type { Database } from "bun:sqlite";

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    verify_code TEXT,
    code_expires_at TEXT,
    refresh_token TEXT,
    refresh_expires_at TEXT,
    reminder_enabled INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS ai_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    model TEXT,
    base_url TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS review_cards (
    card_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    knowledge_point_id TEXT NOT NULL,
    ease REAL NOT NULL DEFAULT 2.5,
    interval INTEGER NOT NULL DEFAULT 1,
    due_date TEXT NOT NULL,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS quiz_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer TEXT,
    is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS error_book_mastered (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    mastered_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS exam_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    score INTEGER,
    duration INTEGER,
    remaining_time INTEGER,
    answers_snapshot TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    detail_json TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS writings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    ai_score_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    knowledge_point_id TEXT NOT NULL,
    content TEXT,
    type TEXT,
    start_offset INTEGER,
    end_offset INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    chapter_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS error_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    description TEXT,
    type TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_estimate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
];

const INDEXES = [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);",
  "CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_configs(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_review_cards_user_id ON review_cards(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_review_cards_due_date ON review_cards(due_date);",
  "CREATE INDEX IF NOT EXISTS idx_quiz_records_user_id ON quiz_records(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_error_book_mastered_user_id ON error_book_mastered(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_exam_records_user_id ON exam_records(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_writings_user_id ON writings(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);",
  "CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);",
];

export function initDatabase(db: Database): void {
  db.transaction(() => {
    for (const sql of TABLES) {
      db.exec(sql);
    }
    for (const sql of INDEXES) {
      db.exec(sql);
    }
    // Migration: add reminder_enabled column if not exists
    const colInfo = db.query<{ name: string }, []>("PRAGMA table_info(users);").all();
    const hasReminderEnabled = colInfo.some((c) => c.name === "reminder_enabled");
    if (!hasReminderEnabled) {
      db.exec("ALTER TABLE users ADD COLUMN reminder_enabled INTEGER DEFAULT 0;");
    }

    const noteColInfo = db.query<{ name: string }, []>("PRAGMA table_info(notes);").all();
    const noteColumns = new Set(noteColInfo.map((c) => c.name));
    if (!noteColumns.has("start_offset")) {
      db.exec("ALTER TABLE notes ADD COLUMN start_offset INTEGER;");
    }
    if (!noteColumns.has("end_offset")) {
      db.exec("ALTER TABLE notes ADD COLUMN end_offset INTEGER;");
    }
    if (!noteColumns.has("created_at")) {
      db.exec("ALTER TABLE notes ADD COLUMN created_at TEXT;");
    }
  })();
}

export default initDatabase;
