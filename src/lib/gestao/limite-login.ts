import { SQL_LIMITAR_LOGIN } from "./queries";
import { consultar } from "./db";
import { chaveTentativaLogin, limitesLogin } from "./limite-login-config";

/**
 * Defesa em profundidade usando a tabela já provisionada.
 * O limite global impede tentativas ilimitadas com identificadores diferentes
 * sem confiar em cabeçalhos de IP potencialmente falsificáveis.
 * Risco residual: atacante pode esgotar o orçamento global e impedir logins
 * legítimos até a próxima janela; não substitui rate limit/WAF na borda.
 * Falha fechada quando o PostgreSQL está indisponível.
 */
export async function permitirTentativaLogin(identificador: string): Promise<boolean> {
  const global = await consultar<{ tentativas: number }>(
    SQL_LIMITAR_LOGIN, [chaveTentativaLogin("global")],
  );
  if ((global[0]?.tentativas ?? limitesLogin.global + 1) > limitesLogin.global) return false;

  const conta = await consultar<{ tentativas: number }>(
    SQL_LIMITAR_LOGIN, [chaveTentativaLogin("identificador", identificador)],
  );
  return (conta[0]?.tentativas ?? limitesLogin.porIdentificador + 1) <= limitesLogin.porIdentificador;
}
