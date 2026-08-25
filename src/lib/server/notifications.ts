import crypto from "crypto";
import { getDb } from "./db";

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

/**
 * 通知を1件作る。
 * id を指定すると「同じ出来事は1度だけ」になる（INSERT OR IGNORE のため）。
 */
export function notify(
  userId: string,
  n: { kind: string; title: string; body?: string; link?: string; id?: string }
) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(n.id ?? crypto.randomUUID(), userId, n.kind, n.title, n.body ?? "", n.link ?? "");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 納期が近い／過ぎている案件のお知らせを作る。
 * 判定はAIではなく日付の引き算で行う（正確・無料・理由を説明できる）。
 * 同じ案件・同じ納期では1度しか作られない。
 */
export function syncDeadlineNotices(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, deadline, status FROM projects WHERE user_id = ? AND status NOT IN ('完了', '未公開')"
    )
    .all(userId) as { id: string; title: string; deadline: string; status: string }[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of rows) {
    if (!p.deadline) continue;
    const due = new Date(`${p.deadline}T00:00:00`);
    if (Number.isNaN(due.getTime())) continue;

    const days = Math.round((due.getTime() - today.getTime()) / DAY_MS);

    if (days < 0) {
      notify(userId, {
        id: `overdue:${p.id}`,
        kind: "deadline",
        title: `「${p.title}」の納期が過ぎています`,
        body: `納期 ${p.deadline}／ステータスは「${p.status}」のままです。`,
        link: "/projects",
      });
    } else if (days <= 5) {
      notify(userId, {
        id: `deadline:${p.id}:${p.deadline}`,
        kind: "deadline",
        title:
          days === 0
            ? `「${p.title}」は今日が納期です`
            : `あと${days}日で「${p.title}」の納期です`,
        body: `納期 ${p.deadline}／ステータスは「${p.status}」です。`,
        link: "/projects",
      });
    }
  }
}

/** 案件のステータスが変わったときのお知らせ */
export function notifyStatusChange(
  ownerId: string,
  project: { id: string; title: string },
  status: string
) {
  const messages: Record<string, { title: string; body: string }> = {
    制作待ち: {
      title: `「${project.title}」の制作が始まりました`,
      body: "担当者が着手しました。完成までお待ちください。",
    },
    フィードバック: {
      title: `「${project.title}」の初稿が提出されました`,
      body: "内容をご確認のうえ、フィードバックをお願いします。",
    },
    完了: {
      title: `「${project.title}」が完了しました`,
      body: "納品物をダウンロードいただけます。",
    },
    募集中: {
      title: `「${project.title}」の募集を開始しました`,
      body: "担当者が決まりしだいお知らせします。",
    },
  };
  const m = messages[status];
  if (!m) return;
  notify(ownerId, { kind: "status", title: m.title, body: m.body, link: "/projects" });
}

/**
 * チャット受信のお知らせ。
 * 同じ相手からの未読はためずに1件にまとめ、いつも最新のメッセージを見せる。
 */
export function notifyChatMessage(
  toId: string,
  from: { id: string; name: string },
  body: string,
  projectTitle?: string | null
) {
  const db = getDb();
  const id = `chat:${from.id}:${toId}`;
  db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  const where = projectTitle ? `「${projectTitle}」について ` : "";
  db.prepare(
    "INSERT INTO notifications (id, user_id, kind, title, body, link) VALUES (?, ?, 'chat', ?, ?, '/chat')"
  ).run(
    id,
    toId,
    `${from.name}さんからメッセージが届きました`,
    `${where}${body.slice(0, 60)}${body.length > 60 ? "…" : ""}`
  );
}
