# Recomendações de HPA

O Titlis analisa métricas reais de CPU e memória dos seus workloads e sugere valores
otimizados de `minReplicas`, `maxReplicas` e targets de utilização — baseados no
comportamento observado, não em defaults genéricos.

---

## Como as recomendações são geradas

O Titlis coleta métricas históricas de uso dos seus workloads (CPU e memória) e aplica
um modelo de análise que considera:

- **Picos de tráfego** — o valor de `minReplicas` garante que você não fique exposto
  antes do autoescalador reagir
- **Utilização média** — o target do HPA é ajustado para que o sistema opere de forma
  eficiente sem sub ou super-provisionar
- **Headroom de segurança** — `maxReplicas` é calculado com margem para absorver picos
  além do histórico observado

Cada recomendação vem com um indicador de **confiança** (Alta / Média / Baixa) que
reflete o volume de dados disponíveis para a análise.

> **Requisito:** para gerar recomendações, é necessário ter a integração com Datadog
> configurada. Veja [Integrações](/docs/integracoes).

---

## Lendo uma recomendação

Na tela **Remediação**, cada card de recomendação exibe:

| Campo | Descrição |
|---|---|
| **Workload** | Nome e namespace do serviço |
| **Configuração atual** | `minReplicas`, `maxReplicas` e target atuais |
| **Configuração sugerida** | Os novos valores recomendados |
| **Confiança** | Alta / Média / Baixa — baseada no volume de dados históricos |
| **Janela de análise** | Período de dados usado para gerar a recomendação |

### Regra de never-reduce

O Titlis **nunca sugere reduzir** `minReplicas`, `maxReplicas` ou limites de recursos.
As recomendações são sempre incrementais ou mantêm o valor atual. Isso garante que
nenhuma automação cause uma degradação acidental.

---

## Aceitar uma recomendação individualmente

Para aplicar a recomendação em um único workload:

1. Na tela **Remediação**, localize o workload desejado
2. Clique em **Aceitar recomendação**
3. O Titlis abre um PR no repositório do workload com os novos valores de HPA
4. Revise o PR e faça merge quando estiver pronto

O PR é criado na branch `titlis/hpa-<workload>-<data>` e contém apenas as alterações
no arquivo de HPA do workload.

---

## Campanhas — aplicar em múltiplos workloads

Quando você quer aplicar a mesma lógica de otimização em dezenas de workloads de uma
vez, use Campanhas. Isso evita abrir e revisar PRs individualmente para cada serviço.

1. Na tela **Remediação**, selecione os workloads desejados (checkbox)
2. Clique em **Criar campanha**
3. Revise o resumo da campanha e confirme

A campanha inicia o processo de PRs em paralelo, com promoção controlada entre ambientes.
Veja mais em [Campanhas](/docs/campanhas).

---

## Filtros disponíveis

Na tela de Remediação você pode filtrar por:
- **Namespace** — focar em um time ou ambiente específico
- **Cluster** — separar workloads de clusters diferentes
- **Confiança** — priorizar recomendações com mais dados históricos
- **Diferença** — focar nos workloads com maior distância entre atual e sugerido

---

## Dúvidas comuns

**A recomendação é aplicada automaticamente?**
Não. Toda recomendação requer ação manual — você decide aceitar individualmente ou
incluir em uma campanha. O Titlis nunca altera sua infraestrutura sem aprovação explícita.

**Por que alguns workloads não têm recomendação?**
Pode acontecer quando:
- O workload tem menos de 7 dias de dados históricos
- A integração com Datadog ainda está sendo configurada
- O workload opera em namespace excluído do monitoramento

**O que acontece se eu rejeitar uma recomendação?**
Nada. A recomendação desaparece da tela e o workload continua com a configuração atual.
Uma nova recomendação pode aparecer no próximo ciclo de análise se o comportamento
do workload mudar.

**Com que frequência as recomendações são atualizadas?**
O ciclo de análise ocorre diariamente. Recomendações antigas são substituídas quando
novos dados produzem uma sugestão diferente.
