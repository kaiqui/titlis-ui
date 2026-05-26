# Integrações

O Titlis se integra com ferramentas do seu stack de engenharia para enriquecer dados,
enviar notificações e criar PRs de correção.

---

## GitHub

A integração com GitHub é necessária para que o ARIA e as campanhas possam criar
branches, commits e Pull Requests nos repositórios dos seus workloads.

### Configurar

1. Acesse **Configurações → Configurar ARIA**
2. No campo **Token do GitHub**, informe um:
   - **Personal Access Token (PAT)** com escopo `repo` e `workflow`; ou
   - **Token de GitHub App** instalado nos repositórios de destino

3. Clique em **Salvar**

### O que o Titlis faz no GitHub

| Ação | Quando |
|---|---|
| Criar branch | Ao iniciar uma remediação ou item de campanha |
| Criar commit | Com o patch de correção do workload |
| Abrir PR | Com descrição detalhada do problema e da mudança |
| Detectar merge/close | Via webhook — para avançar campanhas para o próximo ambiente |

### O que o Titlis **nunca** faz no GitHub

- Fazer merge de PR
- Deletar branches manualmente criadas por você
- Modificar arquivos fora do escopo do workload sendo remediado
- Acessar repositórios não relacionados a workloads monitorados

### Configurando o webhook (campanhas)

Para que as campanhas avancem automaticamente ao detectar merges, configure um webhook
no GitHub apontando para a plataforma. Na tela **Configurações → Configurar ARIA**,
há um botão **Copiar URL do webhook**. Configure no GitHub com:
- **URL:** a URL copiada da plataforma
- **Content type:** `application/json`
- **Eventos:** `Pull requests`

---

## Datadog

A integração com Datadog permite que o Titlis:
- Colete métricas de CPU e memória para gerar **recomendações de HPA**
- Crie e atualize **SLOs** declarados como código no cluster

### Configurar

1. No Datadog, crie uma API Key e uma Application Key com as permissões:
   - API Key: permissão padrão de ingestão
   - Application Key: `metrics_read`, `slos_read`, `slos_write`
2. Acesse **Configurações → Configurar ARIA** na plataforma
3. Preencha os campos **Datadog API Key** e **Datadog Application Key**
4. Selecione o **site** Datadog da sua organização (US1, US3, EU1, etc.)
5. Clique em **Testar conexão** para validar

Após configurar, as recomendações de HPA começam a aparecer no próximo ciclo de análise
(até 24h para os primeiros resultados com dados históricos).

### Diagnóstico da integração

Na tela de Configurações, o status da integração Datadog exibe:
- ✅ **Conectado** — credenciais válidas e dados sendo recebidos
- ⚠️ **Permissão insuficiente** — a Application Key não tem permissão para leitura de métricas ou SLOs
- ❌ **Erro de autenticação** — API Key ou Application Key inválidas

---

## Slack

A integração com Slack envia notificações automáticas para um canal quando eventos
relevantes acontecem na plataforma.

### Eventos notificados

| Evento | Quando |
|---|---|
| Nova degradação crítica | Um workload entra em estado Critical |
| Breach de SLO | Um SLO viola a meta na janela atual |
| Campanha iniciada | Uma nova campanha de remediação começa |
| PR criado | ARIA ou campanha abre um PR no GitHub |
| Aprovação necessária | Campanha aguardando aprovação para promoção em prd |

### Configurar

1. No Slack, crie um Incoming Webhook para o canal de destino
   (Configurações do workspace → Aplicativos → Incoming Webhooks)
2. Acesse **Configurações → Configurar ARIA** na plataforma
3. Preencha a **URL do Webhook do Slack**
4. Selecione as categorias de eventos que deseja receber
5. Salve e use o botão **Enviar teste** para verificar

> **A integração com Slack requer que o operator esteja configurado** com as variáveis
> de ambiente correspondentes no cluster. Peça ao administrador de infraestrutura para
> verificar a configuração do operator se as notificações não chegarem após configurar
> o webhook.

---

## Backstage

A integração com Backstage importa metadados do catálogo de serviços — owners, squads,
tiers, lifecycle — para enriquecer os scorecards e a Topologia.

### O que é importado

| Dado do Backstage | Usado no Titlis |
|---|---|
| `metadata.name` | Mapeamento com o nome do workload |
| `spec.owner` | Atribuição automática de squad |
| `spec.lifecycle` | Tag `lifecycle` nos workloads |
| `metadata.labels` | Tags propagadas para a Topologia |

### Configurar

1. No Backstage, gere um token de acesso para a API catalog
2. Acesse **Configurações → Configurar ARIA** na plataforma
3. Preencha a **URL do Backstage** e o **Token de API**
4. Clique em **Sincronizar catálogo** para importação inicial

A sincronização acontece automaticamente a cada ciclo do operator após a configuração.

---

## Dúvidas comuns

**Preciso de todas as integrações para usar a plataforma?**
Não. Cada integração habilita uma feature específica:
- Sem GitHub: scorecard e SLOs funcionam, mas sem remediação automática
- Sem Datadog: scorecard e ARIA funcionam, mas sem recomendações de HPA e sem sincronização de SLO
- Sem Slack: tudo funciona, sem notificações
- Sem Backstage: tudo funciona, metadados de owner precisam ser configurados manualmente

**As credenciais são armazenadas com segurança?**
Sim. Todas as credenciais são criptografadas em repouso. Após salvas, não são
exibidas novamente na interface — são write-only.

**Posso ter integrações diferentes por cluster?**
As integrações são configuradas por tenant (conta), não por cluster. Todos os clusters
de um tenant usam as mesmas integrações.
