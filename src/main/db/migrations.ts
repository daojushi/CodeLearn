import { getDb } from './connection'

/**
 * 版本化迁移:数组下标 + 1 即版本号,只执行未应用过的版本。
 * 每个版本内包裹在事务中,失败自动回滚。
 */
const MIGRATIONS: string[] = [
  // v1:核心实体表(MVP spec §3-§20)
  `
  CREATE TABLE problems (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    rank             TEXT    NOT NULL DEFAULT 'B'
                     CHECK (rank IN ('S', 'A', 'B', 'C')),
    status           TEXT    NOT NULL DEFAULT 'need_review'
                     CHECK (status IN ('not_started', 'attempting', 'solved', 'need_review', 'mastered')),
    inspiration      TEXT    NOT NULL DEFAULT '',
    note             TEXT    NOT NULL DEFAULT '',
    review_stage     INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at INTEGER,
    next_review_at   INTEGER,
    review_count     INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );

  CREATE TABLE content_blocks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id    INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    type          TEXT    NOT NULL CHECK (type IN ('text', 'image')),
    text          TEXT,
    image_filename TEXT
  );
  CREATE INDEX idx_content_blocks_problem ON content_blocks(problem_id, position);

  CREATE TABLE knowledge_points (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT    NOT NULL DEFAULT '',
    category    TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE problem_knowledge_points (
    problem_id         INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, knowledge_point_id)
  );
  CREATE INDEX idx_pkp_kp ON problem_knowledge_points(knowledge_point_id);

  CREATE TABLE mistake_presets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    is_built_in INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE problem_mistakes (
    problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    preset_id   INTEGER NOT NULL REFERENCES mistake_presets(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, preset_id)
  );
  CREATE INDEX idx_pm_preset ON problem_mistakes(preset_id);

  CREATE TABLE language_presets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    is_built_in INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE solutions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    language_id INTEGER REFERENCES language_presets(id) ON DELETE SET NULL,
    code        TEXT    NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX idx_solutions_problem ON solutions(problem_id);

  CREATE TABLE reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id    INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    result        TEXT    NOT NULL CHECK (result IN ('forgot', 'hard', 'solved', 'easy')),
    reviewed_at   INTEGER NOT NULL,
    next_review_at INTEGER NOT NULL
  );
  CREATE INDEX idx_reviews_problem ON reviews(problem_id);
  `,
  // v2:到期时刻从「精确 24h×N 滚动」改为「自然日对齐」。
  // 存量排期全部按新规则重算:基准日(从未复习 = 创建日,否则 = 上次复习日)+ 当前档位天数 → 当天的 00:00。
  // 例:昨晚 20:24 新建的题,旧排期是今晚 20:24(早上打开 Today 看不到);重算后 = 今天 00:00,一早即可复习。
  `
  UPDATE problems
     SET next_review_at = strftime('%s',
           date(
             (CASE WHEN review_count = 0 THEN created_at ELSE last_reviewed_at END) / 1000,
             'unixepoch', 'localtime',
             CASE review_stage
               WHEN 0 THEN '+1 day' WHEN 1 THEN '+3 day' WHEN 2 THEN '+7 day'
               WHEN 3 THEN '+14 day' ELSE '+30 day'
             END
           ) || ' 00:00:00', 'utc') * 1000
   WHERE status != 'mastered' AND next_review_at IS NOT NULL;
  `
]

export function runMigrations(): void {
  const db = getDb()

  // 已应用的最大版本(表由主进程启动时创建,见 connection.ts)
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').get() as {
    v: number
  }
  let current = row.v

  MIGRATIONS.forEach((sql, index) => {
    const version = index + 1
    if (version <= current) return
    db.exec('BEGIN')
    try {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        version,
        Date.now()
      )
      db.exec('COMMIT')
      console.log(`[main] migration v${version} applied`)
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    current = version
  })
}

/** 调试/测试用:列出当前 schema_migrations 版本 */
export function currentVersion(): number {
  const row = getDb()
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations')
    .get() as { v: number }
  return row.v
}
