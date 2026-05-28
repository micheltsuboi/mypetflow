const phone = "5544999481217";
const message = "🐾 *Vacina Vencendo Hoje!*\n\nA vacina *Quádrupla (Teste)* do(a) *Zeca* vence HOJE (28/05/2026).\n\nNão deixe de proteger o seu pet, agende a revacinação agora mesmo! 💉✨";

async function sendTest() {
  const url = "https://api.z-api.io/instances/3F245682DF48F0823F789694814B07C7/token/7880A683DDA466109EACD383/send-text";
  const clientToken = "F200243e457104ad79273e20e177311a2S";

  console.log(`Enviando mensagem de teste para ${phone}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Z-API: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Mensagem enviada com sucesso!", data);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.message);
  }
}

sendTest().catch(console.error);
