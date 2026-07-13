const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTMyYjg3Zi1kMjNkLTQ5NWEtODE4My03MWRlODNkMDVkOWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcyMTI5OTgxfQ.is9o1DsjpLxdo5xvXAQomdJoRa88oO1A2y_N11ZIJRY";
const BASE_URL = "http://72.62.107.69:5678";

async function run() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": API_KEY }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Count:", json.data.workflows.length);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
