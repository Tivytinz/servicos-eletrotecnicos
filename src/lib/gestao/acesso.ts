import { cookies } from "next/headers";
import { SQL_BUSCAR_SESSAO } from "./queries";
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
  }>(SQL_BUSCAR_SESSAO, [hashTokenSessao(token)]);
  return linhas[0] ?? null;
}

export async function exigirPermissao(acao: AcaoGestao): Promise<UsuarioAutenticado | null> {
  const usuario = await usuarioAtual();
  if (!usuario || !temPermissao(usuario.papeis, acao)) return null;
  return usuario;
}
