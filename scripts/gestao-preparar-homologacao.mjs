#!/usr/bin/env node
/**
 * Provisionamento idempotente do PostgreSQL LOCAL descartável.
 * Nunca utiliza Railway e não aceita URL de banco fora do serviço Docker db.
 */
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const url = process.env.DATABASE_URL_ADMIN;
if (process.env.GESTAO_HOMOLOGACAO_LOCAL !== "CONFIRMADO"
  || !url || new URL(url).hostname !== "db"
  || new URL(url).pathname !== "/gestao_homologacao"
  || new URL(url).username !== "postgres") {
  throw new Error("Bloqueado: exige exclusivamente o banco Docker db/gestao_homologacao");
}

function executar(caminho, argumentos = [], adicionais = {}) {
  const resultado = spawnSync(process.execPath, [caminho, ...argumentos], {
    stdio: "inherit",
    env: { ...process.env, ...adicionais },
  });
  if (resultado.status !== 0) throw new Error("Falha na preparação local: " + caminho);
}

const pool = new Pool({ connectionString: url, max: 1 });
try {
  executar("scripts/gestao-migrate.mjs", ["--apply"], {
    GESTAO_MIGRATIONS_CONFIRM: "APLICAR_GESTAO",
  });
  const roles = await pool.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('gestao_app','gestao_convites')"
  );
  const nomes = new Set(roles.rows.map((r) => r.rolname));
  if (!nomes.has("gestao_app")) {
    executar("scripts/gestao-provision-role.mjs", ["--apply"], {
      GESTAO_ROLE_CONFIRM: "CRIAR_GESTAO_APP",
    });
  }
  if (!nomes.has("gestao_convites")) {
    executar("scripts/gestao-provision-convites-role.mjs", ["--apply"], {
      GESTAO_CONVITES_ROLE_CONFIRM: "CRIAR_ROLE_CONVITES",
    });
  }

  const admin = await pool.query(
    "SELECT id FROM gestao.usuarios WHERE email=$1",
    [process.env.ADMIN_EMAIL]
  );
  if (admin.rowCount === 0) {
    executar("scripts/gestao-bootstrap-admin.mjs");
  }
  const verificador = await pool.query(
    "SELECT 1 FROM gestao.verificadores_senha v JOIN gestao.usuarios u ON u.id=v.usuario_id WHERE u.email=$1",
    [process.env.ADMIN_EMAIL]
  );
  if (verificador.rowCount === 0) {
    executar("scripts/gestao-registrar-verificador.mjs", ["--apply"], {
      GESTAO_VERIFICADOR_CONFIRM: "VALIDAR_CREDENCIAL",
    });
  }
  console.log("Homologação local preparada com migrations, roles e admin fictício.");
} finally {
  await pool.end();
}
