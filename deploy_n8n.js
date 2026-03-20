const fs = require('fs');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678/api/v1/workflows";

async function deploy(file, id) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const payload = {
     name: data.name,
     nodes: data.nodes,
     connections: data.connections,
     settings: data.settings || {}
  };
  console.log(`Deploying ${file} to ${id}...`);
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': API_KEY
    },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
     console.log(`Success deploying ${file}!`);
  } else {
     console.error(`Failed to deploy ${file}:`, await res.text());
  }
}

async function main() {
  await deploy('wf1.json', 'T9SUV3RmaHJz22jr');
  await deploy('wf2.json', 'UglCywyV0m6k6EUg');
  await deploy('wf3.json', 'z8phYF4ViwqcFx9P');
}
main();
