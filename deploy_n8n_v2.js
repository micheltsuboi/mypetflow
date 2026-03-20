const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";

async function deploy(id, jsPatch) {
  try {
    const r = await fetch("http://72.62.107.69:5678/api/v1/workflows/" + id, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    const wf = await r.json();
    const nodes = (wf.activeVersion && wf.activeVersion.nodes) || (wf.data && wf.data.nodes) || wf.nodes;
    
    nodes.forEach(n => {
      if (n.type === "n8n-nodes-base.code") {
         n.parameters.jsCode = "const input = $input.first().json;\nconst body = (input.body && input.body.body) ? input.body.body : (input.body || input);\n" + jsPatch;
      }
      if (n.type === "n8n-nodes-base.httpRequest" && n.name.includes("Z-API")) {
        // Correção das barras duplas: \\/\\/ em vez de //
         n.parameters.url = "={{ $json.wa_integration_type === 'custom' && $json.wa_api_url ? ($json.wa_api_url.toLowerCase().includes('/token/') ? $json.wa_api_url.replace(/\\/$/, '') + '/send-text' : $json.wa_api_url.replace(/\\/$/, '') + '/token/' + $json.wa_api_token + '/send-text') : 'https://api.z-api.io/instances/3ED9BA904B506170EBAEF600A127D137/token/945E1301884A1F957BA8EF84/send-text' }}";
         n.parameters.headerParameters.parameters = [
           { name: "Content-Type", value: "application/json" },
           { 
             name: "Client-Token", 
             value: "={{ $json.wa_integration_type === 'custom' && $json.wa_client_token ? $json.wa_client_token : 'F200243e457104ad79273e20e177311a2S' }}" 
           }
         ];
      }
    });

    await fetch("http://72.62.107.69:5678/api/v1/workflows/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-N8N-API-KEY": API_KEY },
      body: JSON.stringify({
        name: wf.name || (wf.data && wf.data.name),
        nodes: nodes,
        connections: wf.connections || (wf.activeVersion && wf.activeVersion.connections) || (wf.data && wf.data.connections),
        settings: wf.settings || (wf.data && wf.data.settings) || {}
      })
    });
    console.log(id + " updated");
  } catch (e) {
    console.error(id + " error: " + e.message);
  }
}

const patchAgendamento = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst date = body.formattedDate || '';\nconst time = body.formattedTime || '';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nreturn [{\n  json: {\n    phone: phone55,\n    message: '📅 *Agendamento Confirmado!*\\n\\n🐾 Pet: *' + pet + '*\\n✂️ Serviço: *' + service + '*\\n📆 Data: *' + date + '* às *' + time + '*\\n\\nEstamos te esperando! Qualquer dúvida, é só chamar. 🐶',\n    wa_integration_type: body.wa_integration_type || 'system',\n    wa_api_url: body.wa_api_url || '',\n    wa_api_token: body.wa_api_token || '',\n    wa_client_token: body.wa_client_token || ''\n  }\n}];";

const patchStatus = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nconst isConfirmed = (body.newStatus === 'in_progress');\nconst message = body.customMessage || (isConfirmed ? '🛁 Olá! O *' + service + '* do *' + pet + '* acabou de INICIAR! Assim que ele estiver pronto, te avisamos aqui. 🐾' : '✅ *' + pet + '* está pronto! O *' + service + '* foi concluído com sucesso. Daqui a pouco já estará prontinho. 🐶❤️');\nreturn [{ json: { phone: phone55, wa_integration_type: body.wa_integration_type || 'system', wa_api_url: body.wa_api_url || '', wa_api_token: body.wa_api_token || '', wa_client_token: body.wa_client_token || '', message: message } }];";

async function main() {
  await deploy("T9SUV3RmaHJz22jr", patchAgendamento);
  await deploy("UglCywyV0m6k6EUg", patchStatus);
}
main();
