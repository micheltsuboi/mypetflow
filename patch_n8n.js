const fs = require('fs');
const wf1 = JSON.parse(fs.readFileSync('/Users/micheltsuboi/.gemini/antigravity/brain/f042b6ca-a3be-4cb1-9605-478890c5be28/.system_generated/steps/311/output.txt', 'utf8')).data;
const wf2 = JSON.parse(fs.readFileSync('/Users/micheltsuboi/.gemini/antigravity/brain/f042b6ca-a3be-4cb1-9605-478890c5be28/.system_generated/steps/326/output.txt', 'utf8')).data;
const wf3 = JSON.parse(fs.readFileSync('/Users/micheltsuboi/.gemini/antigravity/brain/f042b6ca-a3be-4cb1-9605-478890c5be28/.system_generated/steps/338/output.txt', 'utf8')).data;

function patchCode(nodes) {
  nodes.forEach(n => {
    if (n.type === 'n8n-nodes-base.code' && n.parameters.jsCode) {
      if (n.parameters.jsCode.includes('phone55,')) {
         if (!n.parameters.jsCode.includes('wa_integration_type')) {
           n.parameters.jsCode = n.parameters.jsCode.replace(
             'phone: phone55,\n    message:',
             `phone: phone55,\n    wa_integration_type: (body || appt || {}).wa_integration_type || 'system',\n    wa_api_url: (body || appt || {}).wa_api_url || '',\n    wa_api_token: (body || appt || {}).wa_api_token || '',\n    message:`
           );
         }
      }
    }
    if (n.type === 'n8n-nodes-base.httpRequest' && n.name.includes('Z-API')) {
       n.parameters.url = "={{ $json.wa_integration_type === 'custom' && $json.wa_api_url ? $json.wa_api_url.replace(/\\/$/, '') + '/send-text' : 'https://api.z-api.io/instances/3ED9BA904B506170EBAEF600A127D137/token/945E1301884A1F957BA8EF84/send-text' }}";
       const headers = n.parameters.headerParameters.parameters;
       const hasAuth = headers.find(h => h.name === "={{ $json.wa_integration_type === 'custom' && $json.wa_api_token ? 'Authorization' : 'Client-Token' }}");
       if (!hasAuth) {
           n.parameters.headerParameters.parameters = [
             { name: 'Content-Type', value: 'application/json' },
             { name: "={{ $json.wa_integration_type === 'custom' && $json.wa_api_token ? 'Authorization' : 'Client-Token' }}", value: "={{ $json.wa_integration_type === 'custom' && $json.wa_api_token ? ('Bearer ' + $json.wa_api_token) : 'F200243e457104ad79273e20e177311a2S' }}" }
           ]
       }
    }
  });
}

// 1. Patch Agendamento Confirmation (T9SUV3RmaHJz22jr)
let nodes1 = wf1.activeVersion ? wf1.activeVersion.nodes : wf1.nodes;
let connections1 = wf1.activeVersion ? wf1.activeVersion.connections : wf1.connections;
nodes1.find(n => n.name === 'Montar Mensagem').parameters.jsCode = `const body = $input.first().json.body || {};
const pet = body.petName || 'seu pet';
const service = body.serviceName || 'serviço';
const date = body.formattedDate || '';
const time = body.formattedTime || '';
const phone = (body.tutorPhone || '').replace(/\\D/g, '');
const phone55 = phone.startsWith('55') ? phone : '55' + phone;
return [{
  json: {
    phone: phone55,
    message: \`📅 *Agendamento Confirmado!*\\n\\n🐾 Pet: *\${pet}*\\n✂️ Serviço: *\${service}*\\n📆 Data: *\${date}* às *\${time}*\\n\\nEstamos te esperando! Qualquer dúvida, é só chamar. 🐶\`,
    wa_integration_type: body.wa_integration_type || 'system',
    wa_api_url: body.wa_api_url || '',
    wa_api_token: body.wa_api_token || ''
  }
}];`;
patchCode(nodes1);

fs.writeFileSync('wf1.json', JSON.stringify({id: wf1.id, name: wf1.name, nodes: nodes1, connections: connections1}, null, 2));

// 2. Patch Status Banho (UglCywyV0m6k6EUg)
let nodes2 = wf2.activeVersion ? wf2.activeVersion.nodes : wf2.nodes;
let connections2 = wf2.activeVersion ? wf2.activeVersion.connections : wf2.connections;
nodes2.forEach(n => {
   if(n.name === 'Mensagem: Iniciado') {
      n.parameters.jsCode = `const body = $json.body || $json;
const pet = body.petName || 'seu pet';
const service = body.serviceName || 'serviço';
const phone = (body.tutorPhone || '').replace(/\\D/g, '');
const phone55 = phone.startsWith('55') ? phone : '55' + phone;
return [{ json: { phone: phone55, wa_integration_type: body.wa_integration_type || 'system', wa_api_url: body.wa_api_url || '', wa_api_token: body.wa_api_token || '', message: \`🛁 Olá! O *\${service}* do *\${pet}* acabou de INICIAR! Assim que ele estiver pronto, te avisamos aqui. 🐾\` } }];`;
   }
   if(n.name === 'Mensagem: Finalizado') {
      n.parameters.jsCode = `const body = $json.body || $json;
const pet = body.petName || 'seu pet';
const service = body.serviceName || 'serviço';
const phone = (body.tutorPhone || '').replace(/\\D/g, '');
const phone55 = phone.startsWith('55') ? phone : '55' + phone;
const message = body.customMessage || \`✅ *\${pet}* está pronto! O *\${service}* foi concluído com sucesso. Daqui a pouco já estará prontinho. 🐶❤️\`;
return [{ json: { phone: phone55, wa_integration_type: body.wa_integration_type || 'system', wa_api_url: body.wa_api_url || '', wa_api_token: body.wa_api_token || '', message } }];`;
   }
});
patchCode(nodes2);
fs.writeFileSync('wf2.json', JSON.stringify({id: wf2.id, name: wf2.name, nodes: nodes2, connections: connections2}, null, 2));


// 3. Patch Lembrete 24h (z8phYF4ViwqcFx9P)
let nodes3 = wf3.activeVersion ? wf3.activeVersion.nodes : wf3.nodes;
let connections3 = wf3.activeVersion ? wf3.activeVersion.connections : wf3.connections;
nodes3.forEach(n => {
   if (n.name === 'Buscar Agendamentos 24h1') {
      let selectParam = n.parameters.queryParameters.parameters.find(p => p.name === 'select');
      if (selectParam) {
         selectParam.value = 'id,scheduled_at,status,pets(name),services(name),customers(name,phone_1),organizations(wa_integration_type,wa_api_url,wa_api_token)';
      }
   }
   if (n.name === 'Montar Lembrete1') {
      n.parameters.jsCode = `const appt = $json;
const pet = appt.pets?.name || 'seu pet';
const service = appt.services?.name || 'serviço';
const scheduledAt = new Date(appt.scheduled_at);
const time = scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const date = scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const phone = (appt.customers?.phone_1 || '').replace(/\\D/g, '');
const phone55 = phone.startsWith('55') ? phone : '55' + phone;
const org = appt.organizations || {};
return [{
  json: {
    phone: phone55,
    wa_integration_type: org.wa_integration_type || 'system',
    wa_api_url: org.wa_api_url || '',
    wa_api_token: org.wa_api_token || '',
    message: \`🐾 *Lembrete de Agendamento!*\\n\\nOlá! Passando para lembrar que amanhã, *\${date}* às *\${time}*, o *\${pet}* tem horário de *\${service}* agendado conosco.\\n\\nTe esperamos! 📅✨\`
  }
}];`;
   }
});
patchCode(nodes3);
fs.writeFileSync('wf3.json', JSON.stringify({id: wf3.id, name: wf3.name, nodes: nodes3, connections: connections3}, null, 2));

console.log('Files generated: wf1.json, wf2.json, wf3.json');
