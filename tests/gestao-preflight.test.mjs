import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/gestao-preflight.mjs");

test("preflight não permite --apply e não altera o banco", () => {
  const result = spawnSync(process.execPath, [script, "--apply"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL_ADMIN: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--check/);
});

test("preflight bloqueia ausência de credencial, sem revelar dados", () => {
  const result = spawnSync(process.execPath, [script, "--check"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL_ADMIN: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL_ADMIN ausente/);
  assert.ok(!result.stdout.includes("postgres://"));
});
