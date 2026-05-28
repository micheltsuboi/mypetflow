const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows/";

async function fixWorkflow(id, isToday) {
  try {
    console.log(`\n--- Corrigindo Workflow ID: ${id} ---`);
    const r = await fetch(BASE_URL + id, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    
    if (!r.ok) {
      throw new Error(`Erro ao obter workflow: ${r.statusText}`);
    }
    
    const wf = await r.json();
    const nodes = (wf.activeVersion && wf.activeVersion.nodes) || (wf.data && wf.data.nodes) || wf.nodes;
    
    let modified = false;
    nodes.forEach(n => {
      if (n.name === "WhatsApp Send" || n.id === "WhatsApp Send") {
        console.log("Nó WhatsApp Send encontrado!");
        const parameters = n.parameters?.bodyParameters?.parameters;
        if (parameters && Array.isArray(parameters)) {
          const msgParam = parameters.find(p => p.name === "message");
          if (msgParam) {
            console.log("Parâmetro 'message' atual:", msgParam.value);
            
            // Define o novo valor da expressão de mensagem
            if (isToday) {
              msgParam.value = '={{ "🐾 *Vacina Vencendo Hoje!*\\n\\nA vacina *" + $json.name + "* do(a) *" + $json.pets?.name + "* vence HOJE (" + $json.expiry_date.split(\'-\').reverse().join(\'/\') + ").\\n\\nNão deixe de proteger o seu pet, agende a revacinação agora mesmo! 💉✨" }}';
            } else {
              msgParam.value = '={{ "🐾 *Lembrete de Vacinação!*\\n\\nA vacina *" + $json.name + "* do(a) *" + $json.pets?.name + "* vence em *" + $json.expiry_date.split(\'-\').reverse().join(\'/\') + "*.\\n\\nNão esqueça de agendar a revacinação! 💉✨" }}';
            }
            
            console.log("Parâmetro 'message' corrigido:", msgParam.value);
            modified = true;
          }
        }
      }
    });

    if (!modified) {
      console.log("Nenhuma alteração necessária ou nó WhatsApp Send não encontrado.");
      return;
    }

    const updateResponse = await fetch(BASE_URL + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-N8N-API-KEY": API_KEY },
      body: JSON.stringify({
        name: wf.name || (wf.data && wf.data.name),
        nodes: nodes,
        connections: wf.connections || (wf.activeVersion && wf.activeVersion.connections) || (wf.data && wf.data.connections),
        settings: wf.settings || (wf.data && wf.data.settings) || {}
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Erro ao atualizar workflow: ${updateResponse.statusText}`);
    }

    console.log(`✅ Workflow ${id} (${wf.name || id}) atualizado e ativado com sucesso!`);
  } catch (e) {
    console.error(`❌ Erro no workflow ${id}:`, e.message);
  }
}

async function main() {
  // 1. Vacina Vencendo Hoje
  await fixWorkflow("UQ9G9oCR0ION79wa", true);
  // 2. Lembrete Geral de Vacinação (vence em 7 dias)
  await fixWorkflow("3SPEn65b7asWmbBY", false);
}

main().catch(console.error);
