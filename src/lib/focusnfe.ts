// Service to interact with Focus NFe API v2

// Environments
export const FOCUS_HOMOLOGACAO = 'https://homologacao.focusnfe.com.br/v2';
export const FOCUS_PRODUCAO = 'https://api.focusnfe.com.br/v2';

// The Token Master must be provided in ENV
const MASTER_TOKEN = process.env.FOCUSNFE_TOKEN_MASTER || '';

type FocusEnv = 'homologacao' | 'producao';

export function getBaseUrl(env: FocusEnv) {
  return env === 'producao' ? FOCUS_PRODUCAO : FOCUS_HOMOLOGACAO;
}

function getAuthHeader(token: string) {
  return `Basic ${Buffer.from(`${token}:`).toString('base64')}`;
}

export interface EmitirNfseRequest {
  ref: string;
  data: any; // The full payload for NFSe
  env: FocusEnv;
  token: string;
}

export interface EmitirNfeRequest {
  ref: string;
  data: any; // The full payload for NFe
  env: FocusEnv;
  token: string;
}

export interface CriarEmpresaRequest {
  data: any;
  dry_run?: boolean;
}

export const FocusNfeApi = {
  /**
   * Criar ou atualizar empresa na Focus NFe.
   * Utiliza apenas o ambiente de PRODUÇÃO e o TOKEN MASTER.
   * Pode ser usado com dry_run=1 para testes.
   */
  async criarEmpresa({ data, dry_run = false }: CriarEmpresaRequest) {
    if (!MASTER_TOKEN) {
        throw new Error("FOCUSNFE_TOKEN_MASTER not configured.");
    }
    const url = `${FOCUS_PRODUCAO}/empresas${dry_run ? '?dry_run=1' : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(MASTER_TOKEN)
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        console.error("Focus NFe criarEmpresa Error", errorData);
        throw new Error(JSON.stringify(errorData));
    }

    return response.json();
  },

  /**
   * Emitir NFSe (Serviço)
   */
  async emitirNfse({ ref, data, env, token }: EmitirNfseRequest) {
    const url = `${getBaseUrl(env)}/nfse?ref=${encodeURIComponent(ref)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(token)
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch { errorData = await response.text(); }
        console.error("Focus NFe emitirNfse Error", errorData);
        throw new Error(JSON.stringify(errorData));
    }

    return response.json();
  },

  /**
   * Emitir NFe (Produto)
   */
  async emitirNfe({ ref, data, env, token }: EmitirNfeRequest) {
    const url = `${getBaseUrl(env)}/nfe?ref=${encodeURIComponent(ref)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(token)
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = errorText; }
        console.error("Focus NFe emitirNfe Error", errorData);
        throw new Error(JSON.stringify(errorData));
    }

    return response.json();
  },

  /**
   * Consultar NFSe
   */
  async consultarNfse(ref: string, env: FocusEnv, token: string) {
    const url = `${getBaseUrl(env)}/nfse/${encodeURIComponent(ref)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': getAuthHeader(token) }
    });
    if (!response.ok) throw new Error(`Falha ao consultar NFSe: ${response.statusText}`);
    return response.json();
  },

  /**
   * Consultar NFe
   */
  async consultarNfe(ref: string, env: FocusEnv, token: string) {
    const url = `${getBaseUrl(env)}/nfe/${encodeURIComponent(ref)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': getAuthHeader(token) }
    });
    if (!response.ok) throw new Error(`Falha ao consultar NFe: ${response.statusText}`);
    return response.json();
  },

  /**
   * Cancelar NFSe
   */
  async cancelarNfse(ref: string, justificativa: string, env: FocusEnv, token: string) {
    const url = `${getBaseUrl(env)}/nfse/${encodeURIComponent(ref)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 
        'Authorization': getAuthHeader(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ justificativa })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(JSON.stringify(err));
    }
    return response.json();
  },

  /**
   * Buscar Município IBGE
   */
  async buscarMunicipio(nome: string) {
    if (!MASTER_TOKEN) {
        throw new Error("FOCUSNFE_TOKEN_MASTER not configured.");
    }
    const url = `${FOCUS_PRODUCAO}/municipios?nome=${encodeURIComponent(nome)}`;
    const response = await fetch(url, {
        headers: { 'Authorization': getAuthHeader(MASTER_TOKEN) }
    });
    if (!response.ok) throw new Error('Falha ao buscar município');
    return response.json();
  }
};
