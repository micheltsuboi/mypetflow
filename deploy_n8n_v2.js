const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";

async function deploy(id, jsPatch) {
  try {
    console.log("Updating " + id);
    const r = await fetch("http://72.62.107.69:5678/api/v1/workflows/" + id, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    const json = await r.json();
    const wf = json; // The API v1 GET /workflows/:id returns the workflow object directly if using certain versions, or wrapped in data.
    const nodes = wf.nodes || (json.activeVersion && json.activeVersion.nodes) || (json.data && json.data.nodes);
    
    if (!nodes) {
       console.log("Could not find nodes in response", JSON.stringify(json).substring(0, 100));
       return;
    }

    nodes.forEach(n => {
      if (n.type === "n8n-nodes-base.code") {
         n.parameters.jsCode = "const input = $input.first().json;\nconst body = (input.body && input.body.body) ? input.body.body : (input.body || input);\n" + jsPatch;
      }
      if (n.type === "n8n-nodes-base.httpRequest" && n.name.includes("Z-API")) {
         n.parameters.url = "={{ $json.wa_integration_type === 'custom' && $json.wa_api_url ? $json.wa_api_url.replace(/\\/$/, '') + '/send-text' : 'https://api.z-api.io/instances/3ED9BA904B506170EBAEF600A127D137/token/945E1301884A1F957BA8EF84/send-text' }}";
         n.parameters.headerParameters.parameters = [
           { name: "Content-Type", value: "application/json" },
           { 
             name: "={{ $json.wa_integration_type === 'custom' && $json.wa_api_token ? 'Authorization' : 'Client-Token' }}", 
             value: "={{ $json.wa_integration_type === 'custom' && $json.wa_api_token ? ('Bearer ' + $json.wa_api_token) : 'F200243e457104ad79273e20e177311a2S' }}" 
           }
         ];
      }
    });

    const res = await fetch("http://72.62.107.69:5678/api/v1/workflows/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-N8N-API-KEY": API_KEY },
      body: JSON.stringify({
        name: wf.name || (json.data && json.data.name),
        nodes: nodes,
        connections: wf.connections || (json.activeVersion && json.activeVersion.connections) || (json.data && json.data.connections),
        settings: wf.settings || (json.data && json.data.settings) || {}
      })
    });
    console.log(id + " result: " + res.status);
    if (!res.ok) console.log(await res.text());
  } catch (e) {
    console.error("Error " + id + ": " + e.message);
  }
}

const patchAgendamento = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst date = body.formattedDate || '';\nconst time = body.formattedTime || '';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nreturn [{\n  json: {\n    phone: phone55,\n    message: '📅 *Agendamento Confirmado!*\\n\\n🐾 Pet: *' + pet + '*\\n✂️ Serviço: *' + service + '*\\n📆 Data: *' + date + '* às *' + time + '*\\n\\nEstamos te esperando! Qualquer dúvida, é só chamar. 🐶',\n    wa_integration_type: body.wa_integration_type || 'system',\n    wa_api_url: body.wa_api_url || '',\n    wa_api_token: body.wa_api_token || ''\n  }\n}];";

const patchStatus = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nconst isConfirmed = (body.newStatus === 'in_progress');\nconst message = body.customMessage || (isConfirmed ? '🛁 Olá! O *' + service + '* do *' + pet + '* acabou de INICIAR! Assim que ele estiver pronto, te avisamos aqui. 🐾' : '✅ *' + pet + '* está pronto! O *' + service + '* foi concluído com sucesso. Daqui a pouco já estará prontinho. 🐶❤️');\nreturn [{ json: { phone: phone55, wa_integration_type: body.wa_integration_type || 'system', wa_api_url: body.wa_api_url || '', wa_api_token: body.wa_api_token || '', message: message } }];";

async function main() {
  await deploy("T9SUV3RmaHJz22jr", patchAgendamento);
  await deploy("UglCywyV0m6k6EUg", patchStatus);
}
main();
