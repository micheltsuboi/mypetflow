const fs = require('fs');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678";

const OLD_TOKEN = "F200243e457104ad79273e20e177311a2S";
const NEW_TOKEN = "F9a70c76e1ddd4ec79ff35af7549a478fS";

async function run() {
  const report = {
    updated: [],
    failed: [],
    skipped: []
  };

  try {
    // 1. Get all workflows
    const listRes = await fetch(`${BASE_URL}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    if (!listRes.ok) {
      throw new Error(`Failed to list workflows: ${listRes.status} ${listRes.statusText}`);
    }
    const listData = await listRes.json();
    console.log("Full API Response:", JSON.stringify(listData, null, 2));
    
    // In n8n API, the list workflows response is usually: { data: [ ... ] } or { data: { workflows: [...] } }
    // Let's handle both.
    let workflows = [];
    if (listData.data && Array.isArray(listData.data)) {
      workflows = listData.data;
    } else if (listData.data && listData.data.workflows) {
      workflows = listData.data.workflows;
    } else if (Array.isArray(listData)) {
      workflows = listData;
    }
    
    console.log(`Found ${workflows.length} workflows to inspect.`);

    for (const wfInfo of workflows) {
      const id = wfInfo.id;
      const name = wfInfo.name;
      const wasActive = wfInfo.active;

      try {
        // 2. Fetch full workflow
        const getRes = await fetch(`${BASE_URL}/api/v1/workflows/${id}`, {
          headers: { "X-N8N-API-KEY": API_KEY }
        });
        if (!getRes.ok) {
          throw new Error(`Failed to fetch workflow details: ${getRes.status}`);
        }
        const wf = await getRes.json();
        
        // Convert to string to check for the old token
        const wfString = JSON.stringify(wf);
        if (wfString.includes(OLD_TOKEN)) {
          console.log(`Token found in workflow: ${name} (${id})`);
          
          // Replace token
          const updatedString = wfString.replaceAll(OLD_TOKEN, NEW_TOKEN);
          const updatedWf = JSON.parse(updatedString);
          
          // Prepare update payload
          const payload = {
            name: updatedWf.name,
            nodes: updatedWf.nodes || (updatedWf.data && updatedWf.data.nodes) || [],
            connections: updatedWf.connections || (updatedWf.data && updatedWf.data.connections) || {},
            settings: updatedWf.settings || (updatedWf.data && updatedWf.data.settings) || {}
          };
          
          // 3. Update workflow
          const putRes = await fetch(`${BASE_URL}/api/v1/workflows/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-N8N-API-KEY": API_KEY
            },
            body: JSON.stringify(payload)
          });
          
          if (!putRes.ok) {
            const putText = await putRes.text();
            throw new Error(`Failed to update workflow: ${putRes.status} - ${putText}`);
          }
          
          console.log(`Successfully updated workflow: ${name} (${id})`);
          
          // 4. Verify activation status if it was active
          if (wasActive) {
            // Check if it got deactivated
            const verifyRes = await fetch(`${BASE_URL}/api/v1/workflows/${id}`, {
              headers: { "X-N8N-API-KEY": API_KEY }
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.active) {
              console.log(`Re-activating workflow: ${name} (${id})`);
              const activateRes = await fetch(`${BASE_URL}/api/v1/workflows/${id}/activate`, {
                method: "POST",
                headers: { "X-N8N-API-KEY": API_KEY }
              });
              if (!activateRes.ok) {
                console.warn(`Failed to re-activate workflow ${name} (${id})`);
              }
            }
          }
          
          report.updated.push({ id, name });
        } else {
          console.log(`Token not found in workflow: ${name} (${id}). Skipped.`);
          report.skipped.push({ id, name });
        }
      } catch (err) {
        console.error(`Error processing workflow ${name} (${id}):`, err);
        report.failed.push({ id, name, error: err.message });
      }
    }
  } catch (err) {
    console.error("Global error:", err);
    report.globalError = err.message;
  }

  // Save report
  fs.writeFileSync('scripts/token_update_report.json', JSON.stringify(report, null, 2));
  console.log("Report saved to scripts/token_update_report.json");
}

run();
