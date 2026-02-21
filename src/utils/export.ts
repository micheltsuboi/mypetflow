export const exportToCsv = (filename: string, headers: string[], rows: any[][]) => {
    // Função para processar e escapar caracteres especiais da célula (vírgulas, aspas)
    const processRow = (row: any[]) => {
        return row.map(value => {
            const stringValue = String(value ?? '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    };

    // Montar o conteúdo do CSV com o cabeçalho e as linhas
    const csvContent = [
        processRow(headers),
        ...rows.map(processRow)
    ].join('\n');

    // Cria o Blob forçando o BOM UTF-8 para o Excel reconhecer os acentos
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Cria um link temporário para download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.setAttribute('download', `${filename}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
