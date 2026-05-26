# Scorecards — Termômetro de Confiabilidade

O Termômetro de Confiabilidade avalia cada workload Kubernetes contra um conjunto de
boas práticas SRE organizadas em pilares. O resultado é um score de 0 a 100 que reflete
o nível de maturidade operacional do serviço.

> O score não é uma penalidade — é um mapa. Um score baixo significa que há oportunidades
> claras de melhoria, e o Titlis pode ajudá-lo a corrigi-las.

---

## Os pilares de avaliação

Cada workload é avaliado em quatro pilares principais:

### Resiliência
Avalia se o workload está preparado para falhas e para absorver picos de tráfego.

| Regra | O que verifica |
|---|---|
| Réplicas mínimas | O workload tem ao menos 2 réplicas em produção? |
| Liveness probe | O Kubernetes consegue detectar se o container travou? |
| Readiness probe | O Kubernetes sabe quando o container está pronto para receber tráfego? |
| HPA configurado | Há autoescala horizontal configurada? |
| PodDisruptionBudget | Há proteção contra remoção simultânea de todas as réplicas? |

### Segurança
Avalia se o workload segue princípios de menor privilégio.

| Regra | O que verifica |
|---|---|
| Usuário não-root | O container roda como usuário não-root? |
| Imagem com tag fixa | A imagem usa tag versionada (não `latest`)? |
| Capabilities restritas | O container não solicita capabilities desnecessárias? |
| Read-only filesystem | O filesystem do container é somente leitura? |

### Performance
Avalia se o workload tem limites e reservas de recursos bem calibrados.

| Regra | O que verifica |
|---|---|
| CPU request definido | O container tem `resources.requests.cpu` configurado? |
| CPU limit definido | O container tem `resources.limits.cpu` configurado? |
| Memória request definida | O container tem `resources.requests.memory` configurado? |
| Memória limit definida | O container tem `resources.limits.memory` configurado? |
| HPA com target adequado | O target do HPA está em faixa recomendada (não muito alto nem muito baixo)? |

### Operacional
Avalia se o workload está bem catalogado e rastreável.

| Regra | O que verifica |
|---|---|
| Label de owner | O workload tem label identificando o time responsável? |
| Label de ambiente | O workload tem label identificando o ambiente (prod, staging, dev)? |
| ServiceAccount próprio | O workload usa um ServiceAccount dedicado (não o default)? |
| Versão anotada | O workload tem annotation com a versão da aplicação? |

---

## Entendendo o score

### Score global
A média ponderada dos pilares. Cada pilar tem um peso que pode ser configurado em
**Configurações → Score & Regras**.

### Interpretação rápida

| Score | Significado |
|---|---|
| 80–100 | ✅ Conforme — boas práticas atendidas |
| 60–79 | ⚠️ Atenção — melhorias recomendadas |
| 0–59 | 🔴 Crítico — problemas que impactam disponibilidade e segurança |

### Severidade dos findings

| Severidade | Impacto no score | Exemplos |
|---|---|---|
| **Critical** | Alto | Sem réplicas, rodando como root |
| **High** | Médio-alto | Sem liveness probe, imagem `latest` |
| **Medium** | Médio | Sem limit de CPU, sem label de owner |
| **Low** | Baixo | Sem annotation de versão |
| **Info** | Zero | Informações adicionais, sem penalidade |

### Finding com status "skipped"

Um finding marcado como `skipped` significa que a regra não se aplica ao workload no
contexto atual — por exemplo, uma regra de HPA foi pulada porque o workload não tem
HPA configurado e isso foi permitido pela configuração da sua conta.

---

## Como navegar pelos scorecards

### Visão de lista
A tela **Termômetro de Confiabilidade** exibe todos os workloads com:
- Score global e por pilar
- Cluster e namespace
- Número de findings críticos abertos

Use os filtros para focar:
- **Cluster** — ver apenas um cluster específico
- **Conformidade** — "Não conforme" (score < 80), "Conforme", "Desconhecido"
- **Busca** — pelo nome do workload

### Detalhe do workload
Ao clicar em um workload, você vê:
- Score por pilar com gráfico de breakdown
- Lista completa de findings com severidade, descrição e sugestão de correção
- Histórico de score ao longo do tempo
- Botões de ação (explicar finding com ARIA, corrigir com ARIA)

---

## Corrigir um finding

### Via ARIA (um workload por vez)
Clique em **Corrigir com IA** na tela de detalhe do workload. O ARIA abre um chat
pré-contextualizado com os findings do workload e pode propor e criar um PR de correção.
Veja mais em [ARIA](/docs/assistente-ia).

### Via Campanha (múltiplos workloads)
Para corrigir o mesmo tipo de problema em vários workloads de uma vez, use Campanhas.
Veja mais em [Campanhas](/docs/campanhas).

---

## Dúvidas comuns

**Com qual frequência o score é atualizado?**
O score é recalculado a cada ciclo do operator, que por padrão acontece a cada poucos
minutos. Após um deploy, aguarde até 5 minutos para ver o score atualizado.

**Posso desativar regras que não se aplicam ao meu contexto?**
Sim. Em **Configurações → Score & Regras** (acesso Admin), você pode desativar regras
específicas para todo o tenant ou ajustar os pesos dos pilares.

**O score afeta alguma automação?**
Workloads com score abaixo de um threshold configurável podem ser priorizados em campanhas
automáticas. Esse comportamento é configurável em **Configurações → Auto-Remediação**.
