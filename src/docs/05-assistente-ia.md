# ARIA — Assistente de IA

ARIA é o assistente conversacional integrado ao Titlis. Ela conhece o estado atual de
toda a sua infraestrutura — scorecards, findings, SLOs, histórico de remediações — e
pode propor e executar ações com sua aprovação a cada passo.

---

## Acessando o ARIA

O ARIA está disponível na barra lateral, no item **ARIA**. O acesso requer que sua conta
tenha papel **Engineer** ou superior.

> Para que o ARIA possa criar PRs de remediação, é necessário configurar o token do
> GitHub em **Configurações → Configurar ARIA**.

---

## O que você pode perguntar

O ARIA responde perguntas sobre o estado atual da sua infraestrutura e pode executar
ações com sua aprovação. Exemplos:

### Exploração e diagnóstico
- *"Quais workloads têm score abaixo de 50?"*
- *"Por que o auth-service perdeu pontos em Segurança?"*
- *"Mostre os findings críticos do namespace payments"*
- *"Qual workload teve a maior queda de score esta semana?"*

### SLOs e incidentes
- *"Algum SLO está em risco de breach?"*
- *"Qual é o estado atual do SLO do checkout?"*
- *"Mostre o histórico de incidentes do payment-service"*

### Remediação
- *"Corrija os problemas de Resiliência do checkout-api"*
- *"Crie um PR adicionando liveness probe no auth-service"*
- *"Quais workloads posso corrigir automaticamente hoje?"*

### SLOs (proposta de mudança)
- *"Proponha aumentar o target do SLO checkout-availability para 99.95"*
- *"Gere o YAML de um SLO de disponibilidade para o payment-service"*

---

## Fluxo de aprovação (human-in-the-loop)

O ARIA foi projetado para ser um assistente, não um executor autônomo. Toda ação que
modifica sua infraestrutura passa por uma aprovação explícita sua.

**Como funciona:**

1. Você faz um pedido ao ARIA
2. O ARIA analisa o estado atual e formula um plano
3. Antes de executar, o ARIA exibe um cartão de **Proposta** com:
   - O que será feito
   - Quais dados serão lidos ou modificados
   - O resultado esperado
4. Você clica em **Aprovar** ou **Rejeitar** cada proposta
5. O ARIA executa apenas o que foi aprovado e retorna o resultado

Você pode aprovar ou rejeitar cada ação individualmente — não é tudo ou nada.

---

## Remediação via ARIA

Quando você pede ao ARIA para corrigir um workload, o fluxo é:

1. **ARIA analisa os findings** do workload e propõe um patch de correção
2. **Você revisa o diff** — o ARIA exibe exatamente o que vai mudar no manifest
3. **Você confirma** — o ARIA cria a branch e abre o PR no repositório
4. **Você faz merge** — o PR passa pelo seu fluxo normal de revisão

O Titlis nunca faz merge automaticamente.

### O que o ARIA corrige automaticamente via PR

| Tipo de problema | Exemplo de correção |
|---|---|
| Sem liveness probe | Adiciona `livenessProbe` padrão para o tipo de workload |
| Sem readiness probe | Adiciona `readinessProbe` com healthcheck adequado |
| Imagem com tag `latest` | Sugere fixar na tag da versão atual detectada |
| Sem label de owner | Adiciona label `team` com base no namespace |
| Sem CPU/memória request | Adiciona valores baseados no uso atual observado |
| Sem HPA | Cria um `HorizontalPodAutoscaler` com configuração adequada |

---

## Contexto do assistente

O ARIA tem acesso às seguintes informações para responder suas perguntas:

- Estado atual de todos os scorecards e findings da sua conta
- Histórico de remediações (PRs criados, status, datas)
- SLOs configurados e seus estados
- Base de conhecimento interna da plataforma (regras, boas práticas)

O ARIA **não tem acesso** a:
- Código-fonte dos seus repositórios (exceto o arquivo sendo corrigido durante remediação)
- Logs de aplicação
- Dados de usuários ou clientes dos seus serviços
- Credentials ou tokens de outros sistemas

---

## Dicas de uso

**Seja específico sobre o workload:** em vez de "corrija os problemas de segurança",
prefira "corrija os problemas de segurança do auth-service no namespace production".

**Peça explicações antes de agir:** pergunte "por que o checkout-api tem score baixo
em Resiliência?" antes de pedir correção. O contexto ajuda o ARIA a propor correções
mais precisas.

**Revise o diff com atenção:** o ARIA mostra o diff completo antes de criar o PR.
Leia com atenção — você pode pedir ajustes antes de confirmar.

**Sessões são independentes:** cada conversa começa do zero. Se quiser continuar um
diagnóstico numa sessão anterior, resuma o contexto no início da nova conversa.

---

## Dúvidas comuns

**O ARIA pode derrubar minha aplicação?**
Não. O ARIA não tem acesso a `kubectl` nem pode alterar recursos diretamente no cluster.
Toda ação passa por PR — o impacto acontece apenas quando você faz merge.

**O ARIA pode reduzir réplicas ou diminuir recursos?**
Não. Uma regra técnica da plataforma impede qualquer PR que reduza `minReplicas`,
`maxReplicas`, CPU requests ou memory requests. Isso é verificado automaticamente
antes de o PR ser criado.

**O que acontece se eu rejeitar uma proposta do ARIA?**
O ARIA registra a rejeição, continua a conversa e pode propor uma alternativa diferente
se você quiser.
