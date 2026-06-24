# `.titlis/service.yaml` — a fonte de verdade

O `.titlis/service.yaml` é o arquivo que **você declara no repositório do seu serviço** para
dizer ao Titlis **o que é o serviço, quem é o dono e a quais workloads e filas ele pertence**.
Ele é a **fonte de verdade** da correlação: a partir dele o Titlis monta a árvore
**Produto → Squad → Serviço → Workload/Fila**, atribui dono (squad) e liga o serviço ao seu
score de Cobertura e Confiabilidade.

> Sem `service.yaml`, um workload descoberto aparece como **órfão ("sem dono")**. Declarar o
> arquivo é o que dá nome, dono e contexto ao serviço — é o passo de adoção que organiza tudo.

---

## Onde fica e como é descoberto

- **Caminho:** `.titlis/service.yaml` na **raiz do repositório** do serviço (um por repo/serviço).
- **Descoberta:** o worker **titlis-servicemap** varre os repositórios do GitHub do tenant
  procurando esse arquivo. Para isso, basta ter o **GitHub token configurado** em
  **Configurar ARIA / Integrações**.
- **Frequência:** o worker re-escaneia periodicamente. Ao mudar o `service.yaml`, a correlação
  é re-sincronizada no próximo ciclo (a ligação fila/workload é recalculada a cada upsert).
- **Lifecycle:** se o arquivo deixar de existir, o serviço é marcado como *stale* (soft-delete) —
  histórico e dados não são apagados.

---

## Schema completo

```yaml
apiVersion: titlis.io/v1          # fixo
kind: Service                     # fixo
metadata:
  name: orders-api               # nome do serviço (obrigatório*)
  workload_match:                # (opcional) correlação por padrão — ver abaixo
    namespaces: ["orders-prod"]  # namespaces alvo; vazio/ausente = qualquer
    name_pattern: "orders-.*"    # regex contra o nome do workload
spec:
  owner:
    team: checkout-squad         # dono (squad) — OBRIGATÓRIO (ver nota)
  team: checkout-squad           # forma legada de owner.team (use uma das duas)
  product: checkout              # produto ao qual o serviço pertence
  tier: tier-1                   # criticidade: tier-1 | tier-2 | tier-3
  description: "API de pedidos." # texto livre
  workloads:                     # (opcional) correlação por nome exato
    - orders-api
    - orders-worker
  gitops:                        # (opcional) onde a remediação abre PR
    paths:
      production:
        path: k8s/overlays/prod/orders-api.yaml
        base_branch: main
  integrations:                  # (opcional) correlação de FILAS
    - type: gcp_pubsub           # provider da fila (default: gcp_pubsub)
      match: display_name        # campo casado: display_name | external_id | topic_id
      queues:
        - "orders-*"             # padrões (exact | prefixo* | glob)
        - "orders-events.*"
  remediation:                   # (opcional) overrides livres p/ a remediação
    strategy: pull_request
```

> **\* Obrigatórios:** `spec.owner.team` (ou o legado `spec.team`) **e** um nome de serviço.
> Sem `team`, o worker **ignora** o arquivo. Se `metadata.name` faltar, o worker usa o **nome do
> repositório** como fallback.

---

## Campos em detalhe

### `metadata.name`
Nome do serviço, exibido em todo lugar (Hub, Cobertura, Confiabilidade). Se ausente, cai para
o nome do repositório.

### `spec.owner.team` / `spec.team` — **dono (obrigatório)**
O **squad** dono do serviço. É o que tira o serviço do balde **"sem dono"**. Prefira
`spec.owner.team`; `spec.team` é a forma legada equivalente. **Sem team, o serviço é pulado.**

### `spec.product`
O **produto** que agrupa squads/serviços. É o primeiro nível da árvore do Hub
(Produto → Squad → Serviço). Sem produto, o serviço cai em "(sem produto)".

### `spec.tier`
Criticidade do serviço — **pondera o débito** no termômetro de Confiabilidade:
| tier | peso | uso típico |
|---|---|---|
| `tier-1` | mais alto | crítico (receita, login, checkout) — derruba o "piso crítico" se ficar baixo |
| `tier-2` | médio | importante, sem impacto direto em receita |
| `tier-3` | mais baixo | best-effort / interno |

### `spec.description`
Texto livre descrevendo o serviço.

---

## Correlação de **workloads** (2 formas)

O Titlis precisa saber **quais Deployments** pertencem a este serviço. Há duas formas — use a
que fizer sentido:

### 1. Lista explícita — `spec.workloads`
Casa por **nome exato** do workload (Deployment).
```yaml
spec:
  workloads:
    - orders-api
    - orders-worker
```

### 2. Padrão — `metadata.workload_match` (recomendado para muitos workloads)
Casa por **regex** no nome + filtro opcional de **namespaces**. À prova de futuro:
`orders-.*` cobre workloads atuais e novos.
```yaml
metadata:
  workload_match:
    namespaces: ["orders-prod", "orders-staging"]   # vazio/ausente = qualquer namespace
    name_pattern: "orders-.*"
```
> Quando `workload_match` está presente (com `name_pattern` ou `namespaces`), ele é o caminho
> preferencial. Sem ele, vale a lista `spec.workloads` (nome exato).

---

## Correlação de **filas** — `spec.integrations`

Liga as filas (descobertas via Datadog) a este serviço. Cada item declara padrões de nome:

```yaml
spec:
  integrations:
    - type: gcp_pubsub        # provider (default: gcp_pubsub)
      match: display_name     # campo casado (default: display_name; ou external_id | topic_id)
      queues:
        - "orders-*"          # prefixo  → casa "orders-events-sub", "orders-..."
        - "checkout-paid"     # exato    → casa só "checkout-paid"
        - "billing-*-dlq"     # glob     → casa "billing-x-dlq"
```

**Tipo de match (derivado automaticamente do padrão):**
| Padrão | Tipo | Casa |
|---|---|---|
| `orders-paid` | **exact** | exatamente `orders-paid` |
| `orders-*` | **prefix** | tudo que começa com `orders-` |
| `orders-*-dlq` | **glob** | curinga no meio (`*` = qualquer trecho) |

A cada atualização do `service.yaml`, os padrões de fila são **re-sincronizados** (apagados e
recriados) e as filas existentes são religadas. Filas que não casam com nenhum padrão ficam
**órfãs** (aparecem no balde "sem dono" da Confiabilidade, na seção **Filas**).

---

## `spec.gitops.paths` — onde a remediação abre PR

Diz à ARIA **qual arquivo e branch** alterar quando for corrigir um finding via PR. É um mapa
`ambiente → { path, base_branch }`:
```yaml
spec:
  gitops:
    paths:
      production:
        path: k8s/overlays/prod/orders-api.yaml
        base_branch: main
      staging:
        path: k8s/overlays/staging/orders-api.yaml
        base_branch: develop
```

## `spec.remediation` — overrides livres
Mapa livre consumido pela remediação (ex.: estratégia, política). Opcional.

---

## Exemplos completos

### Mínimo (só o essencial)
```yaml
apiVersion: titlis.io/v1
kind: Service
metadata:
  name: orders-api
spec:
  owner:
    team: checkout-squad
  product: checkout
  tier: tier-1
  workloads:
    - orders-api
```

### Completo (workload_match + filas + gitops)
```yaml
apiVersion: titlis.io/v1
kind: Service
metadata:
  name: orders-api
  workload_match:
    namespaces: ["orders-prod"]
    name_pattern: "orders-.*"
spec:
  owner:
    team: checkout-squad
  product: checkout
  tier: tier-1
  description: "API e workers de pedidos."
  integrations:
    - type: gcp_pubsub
      match: display_name
      queues:
        - "orders-*"
        - "checkout-events.*"
  gitops:
    paths:
      production:
        path: k8s/overlays/prod/orders-api.yaml
        base_branch: main
```

---

## Como saber se deu certo

Depois de commitar o `service.yaml` e aguardar um ciclo do scan:
- O serviço aparece no **Hub** sob o produto/squad declarados (sai do balde "sem dono").
- Em **Confiabilidade**, o serviço lista suas **Aplicações** (workloads) e **Filas** correlacionadas.
- Em **Cobertura**, o serviço ganha um Service Scorecard com Trust Score.

## Erros comuns
- **Serviço não aparece / fica órfão:** falta `team` (owner.team ou spec.team), ou o GitHub token
  não está configurado, ou o arquivo não está em `.titlis/service.yaml` na raiz.
- **Workload não correlaciona:** o `name_pattern` (regex) não casa o nome do Deployment, ou o
  namespace não está na lista de `namespaces`.
- **Fila continua órfã:** o padrão em `integrations.queues` não casa o `display_name` da fila
  (confira prefixo/glob), ou o `match`/`type` está apontando para o campo/provider errado.
