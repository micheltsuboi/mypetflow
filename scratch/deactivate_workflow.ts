const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows/";
const WORKFLOW_ID = "3eCpImD9JvgTn224";

async function run() {
  try {
    // Tenta desativar usando o endpoint padrão do n8n v1
    // A rota oficial na v1 para alterar status de ativo é fazendo um PUT no workflow, 
    // mas vamos testar se o POST no endpoint /deactivate ou semelhante funciona.
    console.log(`\n--- Testando desativação via POST /deactivate ---`);
    const r1 = await fetch(BASE_URL + WORKFLOW_ID + "/deactivate", {
      method: "POST",
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    console.log(`Status POST /deactivate: ${r1.status}`);
    console.log(`Resposta:`, await r1.text());

    // Se o de cima der 404, tentamos fazer o PUT mas enviando apenas a flag de active: false 
    // e o name (ou puxando e limpando o payload para o n8n aceitar)
    if (r1.status === 404) {
      console.log("\n--- Buscando e tentando PUT simplificado ---");
      const rGet = await fetch(BASE_URL + WORKFLOW_ID, {
        headers: { "X-N8N-API-KEY": API_KEY }
      });
      const wf = await rGet.json();
      
      const payload = {
        name: wf.name,
        active: false,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      };

      const rPut = await fetch(BASE_URL + WORKFLOW_ID, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-N8N-API-KEY": API_KEY },
        body: JSON.stringify(payload)
      });
      
      console.log(`Status PUT simplificado: ${rPut.status}`);
      console.log(`Resposta PUT:`, await rPut.text());
    }
  } catch (e: any) {
    console.error(`Erro:`, e.message);
  }
}

run();
