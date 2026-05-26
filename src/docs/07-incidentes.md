# Degradações

A tela de Degradações agrega eventos relevantes de saúde dos seus workloads detectados
pelo operator no cluster. É onde você vê o que está acontecendo de errado agora — ou
o que aconteceu recentemente.

---

## O que aparece como degradação

O Titlis classifica como degradação eventos que indicam instabilidade ou risco real
nos seus workloads:

| Tipo de evento | Exemplos |
|---|---|
| **Queda de disponibilidade** | Pod em CrashLoopBackOff, OOMKilled repetido |
| **Breach de SLO** | Meta de disponibilidade ou latência violada na janela atual |
| **Falha de remediação** | PR de correção fechado sem merge após múltiplas tentativas |
| **Evento crítico de cluster** | Namespace removido, workload excluído inesperadamente |

Mudanças de scorecard (um finding novo ou resolvido) **não geram degradações** — elas
aparecem no Termômetro de Confiabilidade.

---

## Severidades

| Severidade | Significado |
|---|---|
| **Critical** | Serviço indisponível ou violação ativa de SLO de produção |
| **High** | Instabilidade que afeta usuários, mas serviço ainda está parcialmente operando |
| **Medium** | Risco elevado, sem impacto direto ao usuário ainda |
| **Low** | Aviso — algo que merece atenção mas não é urgente |

---

## Lendo uma degradação

Cada card de degradação exibe:

- **Título** — descrição curta do evento
- **Workload afetado** — nome, namespace e cluster
- **Severidade** — badge colorido
- **Tempo** — quando o evento foi detectado
- **Status** — aberto, em investigação, resolvido

Clique em uma degradação para ver a timeline completa do evento, incluindo eventos
relacionados no mesmo workload.

---

## Correlação com scorecard

Quando uma degradação está vinculada a um workload que tem findings no scorecard, a
plataforma mostra um link direto para o scorecard. Isso facilita entender se a degradação
tem relação com uma configuração ausente (ex: sem liveness probe → pod não é reiniciado
automaticamente).

---

## Status de uma degradação

| Status | Significado |
|---|---|
| **Aberto** | Evento ativo, sem resolução |
| **Em investigação** | Alguém na equipe está trabalhando no problema |
| **Resolvido** | Evento encerrado (manualmente ou por detecção de normalização) |

Você pode alterar o status clicando no card e usando o menu de status.

---

## Filtros disponíveis

Na tela de Degradações você pode filtrar por:
- **Cluster** — focar em um ambiente específico
- **Severidade** — ver apenas Critical, por exemplo
- **Status** — apenas abertos, apenas resolvidos
- **Busca por workload** — localizar degradações de um serviço específico

---

## Dúvidas comuns

**As degradações são criadas automaticamente ou preciso configurar alertas?**
O operator detecta e envia eventos automaticamente — não é necessário configurar alertas
ou regras de detecção manualmente.

**Por que não vejo degradações mesmo com workloads com score baixo?**
Score baixo e degradação são conceitos diferentes. Score baixo indica que o workload
não segue boas práticas — mas o serviço pode estar funcionando. Degradação significa
que algo ativamente falhou. Um workload pode ter score 40 e estar sem degradações.

**As degradações são integradas com Slack?**
Sim, quando a integração com Slack está configurada. Veja [Integrações](/docs/integracoes).

**Posso criar uma degradação manualmente?**
Não no momento. Todas as degradações são criadas automaticamente pelo operator.
