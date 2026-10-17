import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS,
  criarTokenSessao, hashTokenSessao, criarHashSenha, verificarSenha,
} from "../src/lib/gestao/sessao.ts";

test("cookie de sessão usa prefixo __Host e expira após 8 horas", () => {
  assert.equal(COOKIE_SESSAO, "__Host-eg_sessao");
  assert.equal(DURACAO_SESSAO_SEGUNDOS, 8 * 60 * 60);
});

test("tokens de sessão são aleatórios, seguros para URL e armazenáveis por hash", () => {
  const primeiro = criarTokenSessao();
  const segundo = criarTokenSessao();
  assert.match(primeiro, /^[A-Za-z0-9_-]{43}$/);
  assert.match(segundo, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(primeiro, segundo);
  assert.match(hashTokenSessao(primeiro), /^[a-f0-9]{64}$/);
  assert.notEqual(hashTokenSessao(primeiro), primeiro);
  assert.notEqual(hashTokenSessao(primeiro), hashTokenSessao(segundo));
});

test("senha correta é verificada e salt aleatório impede hashes iguais", () => {
  const senha = "Senha de teste longa " + randomBytes(12).toString("hex");
  const registro = criarHashSenha(senha);
  const outroRegistro = criarHashSenha(senha);
  assert.match(registro, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(registro, outroRegistro);
  assert.equal(verificarSenha(senha, registro), true);
  assert.equal(verificarSenha(senha + "!", registro), false);
});

test("senha curta, hash inválido e hash adulterado são rejeitados", () => {
  assert.throws(() => criarHashSenha("curta"), RangeError);
  assert.equal(verificarSenha("qualquer senha", "hash-invalido"), false);
  const registro = criarHashSenha("senha-teste-segura-123");
  assert.equal(verificarSenha("senha-teste-segura-123", registro.replace("scrypt$", "md5$")), false);
  assert.equal(verificarSenha("senha-teste-segura-123", registro.replace("$16384$", "$1$")), false);
  assert.equal(verificarSenha("senha-teste-segura-123", registro.slice(0, -2) + "zz"), false);
});
