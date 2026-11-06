import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const channel=readFileSync(".github/workflows/gestao-migrations-chat-command.yml","utf8");
const executor=readFileSync(".github/workflows/gestao-migrations-production-manual.yml","utf8");
const commands=[
  ["verificar","/gestao verificar", "verificar","012",""],
  ["verificar_014","/gestao verificar 014","verificar","014",""],
  ["verificar_015","/gestao verificar 015","verificar","015",""],
  ["aplicar_012","/gestao aplicar 012 APLICAR_012_PRODUCAO_SEM_BACKUP","aplicar","012","APLICAR_012_PRODUCAO_SEM_BACKUP"],
  ["aplicar_013","/gestao aplicar 013 APLICAR_013_PRODUCAO_SEM_BACKUP","aplicar","013","APLICAR_013_PRODUCAO_SEM_BACKUP"],
  ["aplicar_014","/gestao aplicar 014 APLICAR_014_PRODUCAO_SEM_BACKUP","aplicar","014","APLICAR_014_PRODUCAO_SEM_BACKUP"],
  ["aplicar_015","/gestao aplicar 015 APLICAR_015_PRODUCAO_SEM_BACKUP","aplicar","015","APLICAR_015_PRODUCAO_SEM_BACKUP"],
];

test("canal ChatGPT: só comentários novos, do titular e no PR administrativo encerrado",()=>{
  assert.match(channel,/^on:\s*\n\s+issue_comment:\s*\n\s+types: \[created\]/m);
  assert.doesNotMatch(channel,/^\s+(?:push|pull_request_target|workflow_dispatch|schedule):/m);
  assert.match(channel,/^permissions:\s*\n\s+contents: read/m);
  const guards=channel.match(/github\.repository == 'Tivytinz\/servicos-eletrotecnicos' && github\.event\.issue\.number == 64 && github\.event\.issue\.pull_request != null && github\.event\.comment\.user\.id == 263981923 && github\.event\.issue\.state == 'closed'/g)||[];
  assert.equal(guards.length,7,"cada comando precisa de autenticação e PR fixo");
  const ids=Array.from(channel.matchAll(/^  (verificar|verificar_014|verificar_015|aplicar_012|aplicar_013|aplicar_014|aplicar_015):$/gm),x=>x[1]);
  assert.deepEqual(ids,commands.map(x=>x[0]));
  assert.doesNotMatch(channel,/\b(?:run|checkout|eval|exec):/);
});

test("canal ChatGPT: entradas estritamente literais, nunca interpolar conteúdo de comentário",()=>{
  for(const [id,command,mode,release,confirmacao] of commands){
    const begin=channel.indexOf("  "+id+":\n");
    assert.ok(begin>=0);
    const following=channel.slice(begin).split(/\n  (?:verificar|verificar_014|verificar_015|aplicar_012|aplicar_013|aplicar_014|aplicar_015):\n/,1)[0];
    assert.ok(following.includes("github.event.comment.body == '"+command+"'"));
    assert.ok(following.includes("uses: ./.github/workflows/gestao-migrations-production-manual.yml"));
    assert.ok(following.includes("modo: "+mode));
    assert.ok(following.includes('release: "'+release+'"'));
    assert.ok(following.includes('confirmacao: "'+confirmacao+'"'));
    assert.ok(following.includes("secrets: inherit"));
    assert.doesNotMatch(following,/\$\{\{\s*github\.event\.comment\.body/);
  }
});

test("executor original continua manual, reutilizável e com segredos no environment protegido",()=>{
  assert.match(executor,/^on:\s*\n\s+workflow_dispatch:/m);
  assert.match(executor,/^  workflow_call:\s*\n\s+inputs:/m);
  for(const input of ["modo","release","confirmacao"]){
    const declaration=executor.slice(executor.indexOf("  workflow_call:"));
    assert.match(declaration,new RegExp("      "+input+":\\n\\s+description:[^\\n]+\\n\\s+type: string\\n\\s+required: true"));
  }
  assert.match(executor,/environment: gestao-db-production/);
  assert.match(executor,/if: github\.ref == 'refs\/heads\/main'/);
  assert.match(executor,/group: gestao-migrations-production/);
  assert.match(executor,/verificar:014\|verificar:015\|aplicar:012\|aplicar:013\|aplicar:014\|aplicar:015/);
  assert.match(executor,/APLICAR_014_PRODUCAO_SEM_BACKUP/);
  assert.match(executor,/APLICAR_015_PRODUCAO_SEM_BACKUP/);
  assert.match(executor,/RAILWAY_GESTAO_SSH_PRIVATE_KEY/);
  assert.match(executor,/RAILWAY_GESTAO_WORKSPACE_TOKEN/);
  assert.match(executor,/RAILWAY_GESTAO_KNOWN_HOSTS/);
  assert.doesNotMatch(channel,/DATABASE_URL_ADMIN|POSTGRES_PASSWORD|PGPASSWORD/);
});
