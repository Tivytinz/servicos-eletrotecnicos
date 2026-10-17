import { temPermissao, type PapelGestao } from "./permissoes";
import { SQL_CADASTRAR_LEAD } from "./queries";

const ORIGENS = new Set(["whatsapp", "google_ads", "indicacao", "site", "outro"]);

type Persistir = (sql: string, parametros: readonly (string | null)[]) => Promise<unknown>;

/**
 * Regra de autorização e validação usada pela Server Action.
 * A identidade e os papéis devem ser obtidos da sessão no servidor,
 * nunca de campos enviados pelo navegador.
 */
export async function registrarLeadComPermissao(
  formData: FormData,
  contexto: {
    habilitada: boolean;
    papeis: readonly PapelGestao[];
    persistir: Persistir;
  },
): Promise<void> {
  if (!contexto.habilitada) throw new Error("Gestão indisponível");
  if (!temPermissao(contexto.papeis, "leads:criar")) throw new Error("Sem permissão");

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const origem = String(formData.get("origem") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (nome.length < 2 || nome.length > 200 || telefone.length > 40
    || descricao.length < 3 || descricao.length > 4000 || !ORIGENS.has(origem)) {
    throw new Error("Dados inválidos");
  }

  // Criação atômica de cliente e lead, com parâmetros SQL (sem concatenação).
  await contexto.persistir(SQL_CADASTRAR_LEAD, [nome, telefone || null, origem, descricao]);
}
