/**
 * Funções utilitárias de formatação para textos e mensagens do sistema.
 */

/**
 * Extrai apenas o primeiro nome do tutor de forma limpa e amigável para mensagens de WhatsApp.
 * Exemplo:
 * - "Giordane Fabricio Candido Tezon" -> "Giordane"
 * - "GIORDANE" -> "Giordane"
 * - "Dra. Maria Clara" -> "Dra. Maria"
 * - null / "" -> "Tutor"
 */
export function getFirstName(fullName?: string | null): string {
    if (!fullName) return 'Tutor'
    const clean = fullName.trim()
    if (!clean) return 'Tutor'
    const parts = clean.split(/\s+/)
    if (parts.length === 0 || !parts[0]) return 'Tutor'

    const titles = ['dr.', 'dra.', 'dr', 'dra', 'sr.', 'sra.', 'sr', 'sra']
    if (titles.includes(parts[0].toLowerCase()) && parts.length > 1) {
        const title = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
        const name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
        return `${title} ${name}`
    }

    const first = parts[0]
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}
