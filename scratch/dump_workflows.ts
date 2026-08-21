import fs from 'fs'

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows/";

async function dump(id: string, name: string) {
  try {
    const r = await fetch(BASE_URL + id, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!r.ok) {
      console.error(`Erro ao buscar ${name} (${id}): ${r.statusText}`);
      return;
    }
    const data = await r.json();
    fs.writeFileSync(`scratch/wf_${name}.json`, JSON.stringify(data, null, 2));
    console.log(`✅ Salvo scratch/wf_${name}.json`);
  } catch (e: any) {
    console.error(`Erro em ${name}: ${e.message}`);
  }
}

async function main() {
  await dump("3eCpImD9JvgTn224", "vacina_bruna");
}

main().catch(console.error);
