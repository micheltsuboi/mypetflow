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
         // Só aplica o patch de código se o nó tiver parâmetros de entrada de integração
         if (jsPatch && n.parameters.jsCode && n.parameters.jsCode.includes("phone55")) {
            n.parameters.jsCode = jsPatch;
         }
      }
      if (n.type === "n8n-nodes-base.httpRequest" && n.name.includes("Z-API")) {
         n.parameters.url = "={{ $json.wa_integration_type === 'custom' && $json.wa_api_url ? ($json.wa_api_url.toLowerCase().includes('/token/') ? $json.wa_api_url.replace(/\\/$/, '') + '/send-text' : $json.wa_api_url.replace(/\\/$/, '') + '/token/' + $json.wa_api_token + '/send-text') : 'https://api.z-api.io/instances/3F245682DF48F0823F789694814B07C7/token/7880A683DDA466109EACD383/send-text' }}";
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
    console.log("✅ Workflow " + id + " (" + (wf.name || id) + ") atualizado.");
  } catch (e) {
    console.error("❌ " + id + " erro: " + e.message);
  }
}

const patchAgendamento = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst date = body.formattedDate || '';\nconst time = body.formattedTime || '';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nreturn [{\n  json: {\n    phone: phone55,\n    message: '📅 *Agendamento Confirmado!*\\n\\n🐾 Pet: *' + pet + '*\\n✂️ Serviço: *' + service + '*\\n📆 Data: *' + date + '* às *' + time + '*\\n\\nEstamos te esperando! Qualquer dúvida, é só chamar. 🐶',\n    wa_integration_type: body.wa_integration_type || 'system',\n    wa_api_url: body.wa_api_url || '',\n    wa_api_token: body.wa_api_token || '',\n    wa_client_token: body.wa_client_token || ''\n  }\n}];";

const patchStatus = "const pet = body.petName || 'seu pet';\nconst service = body.serviceName || 'serviço';\nconst phone = (body.tutorPhone || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nconst isConfirmed = (body.newStatus === 'in_progress');\nconst message = body.customMessage || (isConfirmed ? '🛁 Olá! O *' + service + '* do *' + pet + '* acabou de INICIAR! Assim que ele estiver pronto, te avisamos aqui. 🐾' : '✅ *' + pet + '* está pronto! O *' + service + '* foi concluído com sucesso. Daqui a pouco já estará prontinho. 🐶❤️');\nreturn [{ json: { phone: phone55, wa_integration_type: body.wa_integration_type || 'system', wa_api_url: body.wa_api_url || '', wa_api_token: body.wa_api_token || '', wa_client_token: body.wa_client_token || '', message: message } }];";

const patchLembrete = "const appt = $json;\nconst pet = appt.pets?.name || 'seu pet';\nconst service = appt.services?.name || 'serviço';\nconst scheduledAt = new Date(appt.scheduled_at);\nconst time = scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });\nconst date = scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });\nconst phone = (appt.customers?.phone_1 || '').replace(/\\D/g, '');\nconst phone55 = phone.startsWith('55') ? phone : '55' + phone;\nconst org = appt.organizations || {};\nreturn [{\n  json: {\n    phone: phone55,\n    wa_integration_type: org.wa_integration_type || 'system',\n    wa_api_url: org.wa_api_url || '',\n    wa_api_token: org.wa_api_token || '',\n    message: '🐾 *Lembrete de Agendamento!*\\n\\nOlá! Passando para lembrar que amanhã, ' + date + ' às ' + time + ', o ' + pet + ' tem horário de ' + service + ' agendado conosco.\\n\\nTe esperamos! 📅✨'\n  }\n}];";

async function main() {
  await deploy("T9SUV3RmaHJz22jr", patchAgendamento);
  await deploy("UglCywyV0m6k6EUg", patchStatus);
  await deploy("UPbdPVXyiGhTdLVh", patchLembrete);
  await deploy("3SPEn65b7asWmbBY", null); // Vacinação (apenas troca URL da Z-API)
  await deploy("iGv778THSMg82jrs", null); // Mensalidade (apenas troca URL da Z-API)
}
main();
