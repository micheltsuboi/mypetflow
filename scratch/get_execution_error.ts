import fs from 'fs'

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/executions/5722";

async function run() {
  try {
    const r = await fetch(BASE_URL, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!r.ok) {
      console.error(`Erro ao buscar execução: ${r.statusText}`);
      return;
    }
    const data = await r.json();
    fs.writeFileSync('scratch/execution_5722.json', JSON.stringify(data, null, 2));
    console.log("✅ Salvo scratch/execution_5722.json");
  } catch (e: any) {
    console.error(`Erro: ${e.message}`);
  }
}

run();
