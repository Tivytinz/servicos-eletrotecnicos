import { readFileSync } from "node:fs";

const content = readFileSync("package-lock.json", "utf8");
const chunkSize = 2500;
const count = Math.ceil(content.length / chunkSize);

console.log(`LOCKCOUNT:${count}`);

for (let index = 0; index < count; index += 1) {
  const chunk = content.slice(index * chunkSize, (index + 1) * chunkSize);
  const encoded = Buffer.from(chunk, "utf8").toString("base64");
  console.log(`LOCKCHUNK:${String(index).padStart(3, "0")}:${encoded}`);
  await new Promise((resolve) => setTimeout(resolve, 120));
}
