const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/executions";

async function run() {
  try {
    // Buscar as últimas 10 execuções gerais do n8n
    const url = `${BASE_URL}?limit=20`;
    const r = await fetch(url, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!r.ok) {
      console.error(`Erro ao buscar execuções: ${r.statusText}`);
      return;
    }
    const data = await r.json();
    console.log(`Últimas ${data.data?.length} execuções no n8n:`);
    data.data?.forEach((exe: any) => {
      console.log(`- ID: ${exe.id} | Workflow ID: ${exe.workflowId} | Status: ${exe.status} | Iniciado em: ${exe.startedAt} | Finalizado em: ${exe.stoppedAt}`);
    });
  } catch (e: any) {
    console.error(`Erro: ${e.message}`);
  }
}

run();
