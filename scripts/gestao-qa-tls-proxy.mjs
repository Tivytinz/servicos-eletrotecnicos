#!/usr/bin/env node
/** Proxy HTTPS exclusivamente local para testar os formulários com Origin HTTPS.
 * Não incluir no deploy: exige certificados de teste passados por argumentos.
 */
import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";

const [keyPath, certPath] = process.argv.slice(2);
if (!keyPath || !certPath || process.env.GESTAO_QA_PROXY !== "LOCAL_DESCARTAVEL") {
  throw new Error("Somente QA local; requer GESTAO_QA_PROXY=LOCAL_DESCARTAVEL e certificados de teste");
}
https.createServer({
  key: readFileSync(keyPath),
  cert: readFileSync(certPath),
}, (req, res) => {
  const upstream = http.request({
    hostname: "127.0.0.1",
    port: 3210,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: "localhost:3443",
      "x-forwarded-host": "localhost:3443",
      "x-forwarded-proto": "https",
    },
  }, (fromApp) => {
    res.writeHead(fromApp.statusCode ?? 502, fromApp.headers);
    fromApp.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end("Serviço de QA indisponível");
  });
  req.pipe(upstream);
}).listen(3443, "127.0.0.1", () => {
  process.stdout.write("Proxy HTTPS local pronto.\n");
});
