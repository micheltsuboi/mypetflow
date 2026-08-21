const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows";

async function run() {
  try {
    const r = await fetch(BASE_URL, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!r.ok) {
      console.error(`Erro ao listar workflows: ${r.statusText}`);
      return;
    }
    const data = await r.json();
    console.log(`Encontrados ${data.data?.length} workflows no n8n:`);
    data.data?.forEach((wf: any) => {
      console.log(`- ID: ${wf.id} | Nome: "${wf.name}" | Ativo: ${wf.active}`);
    });
  } catch (e: any) {
    console.error(`Erro: ${e.message}`);
  }
}

run();
