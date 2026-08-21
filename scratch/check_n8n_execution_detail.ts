const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/executions/";

async function showDetail(id: string, label: string) {
  try {
    const url = BASE_URL + id;
    const r = await fetch(url, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!r.ok) {
      console.error(`Erro ao buscar execução ${id}: ${r.statusText}`);
      return;
    }
    const data = await r.json();
    console.log(`\n=== Detalhe da Execução ${id} (${label}) ===`);
    console.log(`Workflow ID: ${data.workflowId} | Status: ${data.status}`);
    
    // Mostra se o nó do Supabase ou HTTP Request retornou dados e quais foram
    // O n8n salva os dados da execução em data.data.resultData.runData
    const runData = data.data?.resultData?.runData;
    if (runData) {
      for (const nodeName in runData) {
        const nodeRuns = runData[nodeName];
        nodeRuns.forEach((run: any, idx: number) => {
          const outputData = run.data?.main?.[0];
          console.log(`  Nó: "${nodeName}" (Execução ${idx + 1}):`);
          if (outputData && outputData.length > 0) {
            console.log(`    Retornou ${outputData.length} itens. Amostra do primeiro:`, JSON.stringify(outputData[0].json || outputData[0], null, 2).slice(0, 300) + '...');
          } else {
            console.log(`    Nenhum dado retornado ou vazio.`);
          }
          if (run.error) {
             console.log(`    ⚠️ Erro detectado no nó:`, JSON.stringify(run.error, null, 2));
          }
        });
      }
    } else {
      console.log("Sem runData disponível.");
    }
  } catch (e: any) {
    console.error(`Erro: ${e.message}`);
  }
}

async function main() {
  await showDetail("5722", "Erro da Dra Bruna");
  await showDetail("5721", "Sucesso da Mensalidade");
  await showDetail("5719", "Sucesso da Vacina 7 Dias");
}

main().catch(console.error);
