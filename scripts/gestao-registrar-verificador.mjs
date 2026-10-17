#!/usr/bin/env node
/**
 * Cadastro controlado de verificador bcrypt de login SQL para contas LEGADAS.
 * Nunca colocar DATABASE_URL_ADMIN no serviço web.
 *
 * Execução operacional explícita e privada, somente após revisão/autorização.
 * O operador informa ADMIN_USUARIO e ADMIN_PASSWORD em variáveis privadas.
 * A senha deve ser a senha real já cadastrada (validada contra scrypt existente).
 */
import { Pool } from "pg";
import { verificarSenha } from "../src/lib/gestao/sessao.ts";

const url = process.env.DATABASE_URL_ADMIN;
const identificador = (process.env.ADMIN_USUARIO ?? "").trim().toLowerCase();
const senha = process.env.ADMIN_PASSWORD ?? "";
if (process.argv.length !== 3 || process.argv[2] !== "--apply"
  || process.env.GESTAO_VERIFICADOR_CONFIRM !== "VALIDAR_CREDENCIAL"
  || !url || !/^[a-z][a-z0-9_.-]{2,31}$/.test(identificador)
  || senha.length < 12 || senha.length > 1024) {
  console.error("Requer DATABASE_URL_ADMIN, ADMIN_USUARIO, ADMIN_PASSWORD e GESTAO_VERIFICADOR_CONFIRM=VALIDAR_CREDENCIAL; modo --apply.");
  process.exit(2);
}
const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  const { rows: [conta] } = await client.query(
    "SELECT id, senha_hash FROM gestao.usuarios WHERE usuario = $1 AND ativo = true FOR UPDATE",
    [identificador],
  );
  if (!conta || !verificarSenha(senha, conta.senha_hash)) {
    throw new Error("Senha atual inválida, conta inativa ou usuário inexistente");
  }
  const result = await client.query(
    `INSERT INTO gestao.verificadores_senha (usuario_id, bcrypt_hash)
     VALUES ($1, public.crypt(encode(public.digest(convert_to($2, 'UTF8'), 'sha256'), 'hex'), public.gen_salt('bf', 12)))
     ON CONFLICT (usuario_id) DO NOTHING RETURNING usuario_id`,
    [conta.id, senha],
  );
  if (result.rowCount !== 1) {
    throw new Error("Verificador já existe: não sobrescrever automaticamente");
  }
  await client.query("COMMIT");
  console.log("Verificador de login SQL cadastrado após validação da senha existente.");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error("Operação não concluída:", error instanceof Error ? error.message : "erro");
  process.exitCode = 1;
} finally {
  if (client) client.release();
  await pool.end();
}
