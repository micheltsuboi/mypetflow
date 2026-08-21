import fs from 'fs'

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows/";
const WORKFLOW_ID = "iGv778THSMg82jrs";

async function run() {
  try {
    console.log("--- 1. LENDO WORKFLOW ORIGINAL DO ARQUIVO ---");
    const fileContent = fs.readFileSync('scratch/wf_mensalidade.json', 'utf8');
    const wf = JSON.parse(fileContent);

    // 2. Criando o novo nó HTTP Auto-Renew
    const newHttpNode = {
      id: "http_auto_renew_id",
      name: "HTTP Auto-Renew",
      parameters: {
        method: "POST",
        url: "https://mypetflow.com.br/api/subscriptions/cron",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              "name": "Authorization",
              "value": "Bearer mypetflow_n8n_secret_2026"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            {
              "name": "action",
              "value": "renew"
            }
          ]
        }
      },
      position: [
        100,
        150
      ],
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1
    };

    // 3. Atualizando a lista de nós
    wf.nodes = wf.nodes.filter((n: any) => n.name !== "HTTP Auto-Renew");
    wf.nodes.push(newHttpNode);

    // Ajusta a posição dos outros nós
    const scheduleNode = wf.nodes.find((n: any) => n.name === "Schedule");
    if (scheduleNode) scheduleNode.position = [0, 0];
    
    const codeNode = wf.nodes.find((n: any) => n.name === "Code");
    if (codeNode) codeNode.position = [200, 0];

    const supabaseNode = wf.nodes.find((n: any) => n.name === "Supabase Fetch");
    if (supabaseNode) supabaseNode.position = [400, 0];

    const waNode = wf.nodes.find((n: any) => n.name === "WhatsApp Send");
    if (waNode) waNode.position = [600, 0];

    // 4. Atualizando conexões
    wf.connections["Schedule"] = {
      main: [
        [
          {
            index: 0,
            node: "HTTP Auto-Renew",
            type: "main"
          }
        ]
      ]
    };

    wf.connections["HTTP Auto-Renew"] = {
      main: [
        [
          {
            index: 0,
            node: "Code",
            type: "main"
          }
        ]
      ]
    };

    wf.connections["Code"] = {
      main: [
        [
          {
            index: 0,
            node: "Supabase Fetch",
            type: "main"
          }
        ]
      ]
    };

    // 5. Enviando o update para o n8n via API (Sem a flag 'active')
    console.log("Enviando atualização de estrutura para o n8n...");
    
    const response = await fetch(BASE_URL + WORKFLOW_ID, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": API_KEY
      },
      body: JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao salvar workflow no n8n: ${response.statusText} - ${errText}`);
    }
    console.log(`✅ Estrutura do workflow atualizada!`);

    // 6. Ativando o workflow usando o endpoint oficial do n8n v1
    console.log("Ativando o workflow no n8n...");
    const actRes = await fetch(BASE_URL + WORKFLOW_ID + "/activate", {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": API_KEY
      }
    });

    if (!actRes.ok) {
      const errText = await actRes.text();
      console.warn(`⚠️ Aviso: erro ao ativar o workflow via /activate: ${actRes.statusText} - ${errText}`);
    } else {
      console.log("✅ Workflow ativado com sucesso!");
    }

    // Salva localmente
    fs.writeFileSync('scratch/wf_mensalidade_patched.json', JSON.stringify(wf, null, 2));
    console.log("Salvo scratch/wf_mensalidade_patched.json");

  } catch (e: any) {
    console.error("❌ Erro no patch:", e.message);
  }
}

run();
