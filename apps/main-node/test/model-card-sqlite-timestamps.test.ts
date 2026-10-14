import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqlModelCardRepo } from "@open-managed-agents/model-cards-store";

const databases: Database.Database[] = [];
const tenantId = "tenant-timestamps";
const cardId = "card-timestamps";

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

function storedCard(timestamps: {
  createdAt: number | string;
  updatedAt: number | string | null;
  archivedAt: number | string | null;
}) {
  const db = new Database(":memory:");
  databases.push(db);
  const orm = drizzle(db);
  migrate(orm, { migrationsFolder: resolve(import.meta.dirname, "../migrations-sqlite") });
  db.prepare(`INSERT INTO model_cards
    (id, tenant_id, model_id, model, provider, api_key_cipher, api_key_preview,
     is_default, created_at, updated_at, archived_at)
    VALUES (?, ?, 'legacy-model', 'model-test', 'ant', 'encrypted-test', 'test',
            1, ?, ?, ?)`).run(
    cardId, tenantId, timestamps.createdAt, timestamps.updatedAt, timestamps.archivedAt,
  );
  return { db, repo: new SqlModelCardRepo(orm) };
}

describe("SqlModelCardRepo SQLite timestamps", () => {
  it("reads a legacy ISO updated_at stored as TEXT in an INTEGER column", async () => {
    const { db, repo } = storedCard({
      createdAt: 1791314210356,
      updatedAt: "2026-10-07T12:38:18.743Z",
      archivedAt: null,
    });
    expect(db.prepare(`SELECT typeof(created_at) AS created, typeof(updated_at) AS updated
      FROM model_cards WHERE id = ?`).get(cardId)).toEqual({ created: "integer", updated: "text" });
    const timestamps = {
      created_at: "2026-10-06T19:16:50.356Z",
      updated_at: "2026-10-07T12:38:18.743Z",
      archived_at: null,
    };

    await expect(repo.get(tenantId, cardId)).resolves.toMatchObject(timestamps);
    await expect(repo.list(tenantId)).resolves.toEqual([expect.objectContaining(timestamps)]);
    await expect(repo.listPage(tenantId, { limit: 10 })).resolves.toMatchObject({
      items: [expect.objectContaining(timestamps)], hasMore: false,
    });
    await expect(repo.findByModelId(tenantId, "legacy-model")).resolves.toMatchObject(timestamps);
    await expect(repo.getDefault(tenantId)).resolves.toMatchObject(timestamps);

    await expect(repo.update(tenantId, cardId, { updatedAt: 1791376700000 }))
      .resolves.toMatchObject({ updated_at: "2026-10-07T12:38:20.000Z" });
    expect(db.prepare("SELECT typeof(updated_at) AS updated FROM model_cards WHERE id = ?")
      .get(cardId)).toEqual({ updated: "integer" });
  });

  it("reads canonical legacy ISO values in created_at and archived_at", async () => {
    const { repo } = storedCard({
      createdAt: "2026-10-06T18:36:50.356Z",
      updatedAt: null,
      archivedAt: "2026-10-07T12:38:18.743Z",
    });
    await expect(repo.get(tenantId, cardId)).resolves.toMatchObject({
      created_at: "2026-10-06T18:36:50.356Z",
      updated_at: null,
      archived_at: "2026-10-07T12:38:18.743Z",
    });
  });

  it.each(["createdAt", "updatedAt", "archivedAt"] as const)(
    "rejects an invalid stored %s instead of substituting a timestamp", async (column) => {
      const { repo } = storedCard({
        createdAt: 1791314210356, updatedAt: null, archivedAt: null,
        [column]: "not-a-timestamp",
      });
      await expect(repo.get(tenantId, cardId)).rejects.toBeInstanceOf(RangeError);
    },
  );
});
