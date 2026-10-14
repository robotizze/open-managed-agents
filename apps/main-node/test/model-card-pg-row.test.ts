import { describe, expect, it } from "vitest";
import { SqlModelCardRepo } from "@open-managed-agents/model-cards-store";

describe("SqlModelCardRepo PostgreSQL rows", () => {
  it("normalizes BIGINT strings returned by postgres.js", async () => {
    const rawRow = {
      id: "mdl-pg",
      tenant_id: "tenant-pg",
      model_id: "pg-handle",
      model: "gpt-pg",
      provider: "oai-compatible",
      base_url: null,
      custom_headers: null,
      pi_config: null,
      api_key_cipher: "cipher",
      api_key_preview: "last",
      is_default: "1",
      created_at: "1785739431368",
      updated_at: "1785739432368",
      archived_at: null,
    };
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({ get: async () => rawRow }),
        }),
      }),
    };

    const repo = new SqlModelCardRepo(db as never);

    await expect(repo.get("tenant-pg", "mdl-pg")).resolves.toMatchObject({
      is_default: true,
      created_at: "2026-08-03T06:43:51.368Z",
      updated_at: "2026-08-03T06:43:52.368Z",
    });
  });

  it.each([
    1791314210356,
    "1791314210356",
    1791314210356n,
    "2026-10-06T19:16:50.356Z",
  ])("normalizes timestamp representation %s", async (timestamp) => {
    const repo = timestampRepo(timestamp);
    await expect(repo.get("tenant-pg", "mdl-pg")).resolves.toMatchObject({
      created_at: "2026-10-06T19:16:50.356Z",
      updated_at: "2026-10-06T19:16:50.356Z",
      archived_at: "2026-10-06T19:16:50.356Z",
    });
  });

  it.each([
    "",
    "   ",
    "not-a-timestamp",
    "2026-02-30T12:38:18.743Z",
    "2026-10-07T25:38:18.743Z",
    "10/07/2026",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    8640000000000001,
  ])("rejects invalid timestamp %s", async (timestamp) => {
    await expect(timestampRepo(timestamp).get("tenant-pg", "mdl-pg"))
      .rejects.toBeInstanceOf(RangeError);
  });
});

function timestampRepo(timestamp: number | string | bigint) {
  const rawRow = {
    id: "mdl-pg", tenant_id: "tenant-pg", model_id: "pg-handle", model: "gpt-pg",
    provider: "oai-compatible", base_url: null, custom_headers: null, pi_config: null,
    api_key_cipher: "cipher", api_key_preview: "last", is_default: "1",
    created_at: timestamp, updated_at: timestamp, archived_at: timestamp,
  };
  return new SqlModelCardRepo({
    select: () => ({ from: () => ({ where: () => ({ get: async () => rawRow }) }) }),
  } as never);
}
