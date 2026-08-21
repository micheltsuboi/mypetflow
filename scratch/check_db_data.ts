import fs from 'fs'

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZGVmeHBva3hwZnpxa2Vod216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjQ3NjAsImV4cCI6MjA4MjQwMDc2MH0.i5u_fa2q8GxkibeApRia4EELLfMFAv7-yR_K5xLhRBU"

async function run() {
  try {
    const url = "https://oudefxpokxpfzqkehwmz.supabase.co/rest/v1/protocolo_vacinal?select=data_reforco,pet:pets(nome),tutor:tutores(nome,celular),vacina:vacinas(nome)&data_reforco=eq.2026-07-31"
    
    console.log(`[Teste Banco Antigo Bruna] Fetching: ${url}`)
    const r = await fetch(url, {
      headers: {
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`
      }
    })
    
    console.log(`Status: ${r.status}`)
    console.log("Response:", await r.text())

  } catch (err: any) {
    console.error("Erro fatal:", err.message)
  }
}

run()
