const fs = require('fs');
const path = require('path');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const N8N_URL = "http://72.62.107.69:5678/api/v1/workflows";

async function deploy() {
  try {
    const jsonPath = path.join(__dirname, 'n8n-workflows', 'workflow_D_disparo_massa.json');
    if (!fs.existsSync(jsonPath)) {
      console.error("❌ Arquivo JSON do workflow não encontrado localmente.");
      return;
    }

    const workflowData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 1. Listar workflows no N8N para ver se já existe por nome
    const listRes = await fetch(N8N_URL, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    
    if (!listRes.ok) {
      throw new Error(`Falha ao listar workflows (Status ${listRes.status})`);
    }

    const listData = await listRes.json();
    const existing = listData.data.find(w => w.name === workflowData.name);

    let res;
    let url;
    let method;

    if (existing) {
      console.log(`🔄 Encontrado workflow existente com ID: ${existing.id}. Atualizando...`);
      url = `${N8N_URL}/${existing.id}`;
      method = "PUT";
    } else {
      console.log("➕ Criando novo workflow no N8N...");
      url = N8N_URL;
      method = "POST";
    }

    // Configura o payload para salvar e ativar
    const payload = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {}
    };

    res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro no deploy (Status ${res.status}): ${errText}`);
    }

    const resData = await res.json();
    const workflowId = resData.id;
    console.log(`✅ Workflow publicado com sucesso! ID no N8N: ${workflowId}`);

    // Se o workflow foi criado recentemente ou atualizado, garante que esteja ativo
    if (!resData.active) {
      console.log(`⚡ Ativando workflow ${workflowId}...`);
      const activateRes = await fetch(`${N8N_URL}/${workflowId}/activate`, {
        method: "POST",
        headers: { "X-N8N-API-KEY": API_KEY }
      });
      if (activateRes.ok) {
        console.log(`⚡ Workflow ${workflowId} ativado com sucesso.`);
      } else {
        console.warn(`⚠️ Não foi possível ativar o workflow automaticamente.`);
      }
    }

  } catch (error) {
    console.error("❌ Erro ao realizar deploy do workflow:", error.message);
  }
}

deploy();
