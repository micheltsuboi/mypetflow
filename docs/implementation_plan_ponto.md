# Implementação do Relatório de Ponto

## Objetivo
Permitir que o Owner visualize o histórico de ponto dos funcionários, com cálculo de horas trabalhadas conforme a jornada prevista e saldo de horas (banco de horas).

## Alterações Realizadas

1.  **Atualização da Página de Histórico (`src/app/(dashboard)/owner/ponto/page.tsx`)**:
    -   Substituição da tabela simples por uma visualização agrupada por funcionário.
    -   Adição de filtros por período e por funcionário específico.
    -   Cálculo automático de **Jornada Prevista** baseada no perfil do usuário (`work_start_time`, etc).
    -   Cálculo de **Saldo de Horas** (Trabalhado - Previsto).
    -   Visualização de detalhes diários (entradas/saídas).

2.  **Cálculos**:
    -   **Horas Trabalhadas**: Soma da diferença entre `clock_in` e `clock_out` de cada par de registros do dia.
    -   **Horas Previstas**: Diferença entre `work_end_time` e `work_start_time`, descontando intervalo de almoço (`lunch_end` - `lunch_start`). Padrão: 8h (480 min) se não configurado.
    -   **Saldo**: Diferença entre Trabalhado e Previsto.

3.  **Estilização (`page.module.css`)**:
    -   Layout em cards para melhor organização.
    -   Indicadores visuais de saldo positivo (verde) e negativo (vermelho).

## Próximos Passos (Sugestões)
-   Implementar detecção de faltas (gerar dias vazios no relatório para dias úteis sem registro).
-   Exportação para PDF/Excel.
