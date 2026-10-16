import { cookies } from "next/headers";
import { consultar } from "./db";
import { COOKIE_SESSAO, hashTokenSessao } from "./sessao";
import { type AcaoGestao, type PapelGestao, temPermissao } from "./permissoes";

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  papeis: PapelGestao[];
};

export async function usuarioAtual(): Promise<UsuarioAutenticado | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const linhas = await consultar<{
    id: string; nome: string; papeis: PapelGestao[];
  }>(`
    SELECT u.id, u.nome,
      COALESCE(array_agg(up.papel_codigo) FILTER (WHERE up.papel_codigo IS NOT NULL),
        ARRAY[]::text[]) AS papeis
    FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id = s.usuario_id
    LEFT JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
    WHERE s.token_hash = $1 AND s.revogada_em IS NULL
      AND s.expira_em > now() AND u.ativo = true
    GROUP BY u.id, u.nome
    LIMIT 1
  `, [hashTokenSessao(token)]);
  return linhas[0] ?? null;
}

export async function exigirPermissao(acao: AcaoGestao): Promise<UsuarioAutenticado | null> {
  const usuario = await usuarioAtual();
  if (!usuario || !temPermissao(usuario.papeis, acao)) return null;
  return usuario;
}
