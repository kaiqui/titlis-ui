# SLOs — Service Level Objectives

O Titlis permite declarar SLOs diretamente no seu repositório, como código, e os
sincroniza automaticamente com seu provedor de observabilidade. Você define o objetivo
uma vez; o Titlis cuida de mantê-lo atualizado.

---

## O que é um SLO no Titlis

Um SLO (Service Level Objective) define uma meta mensurável de confiabilidade para um
serviço — por exemplo, "99,9% das requisições do checkout respondem em menos de 500ms".

No Titlis, um SLO é declarado como um recurso Kubernetes (CRD) no cluster onde o serviço
roda. O operator detecta esses recursos e os sincroniza com a plataforma, que por sua
vez cria ou atualiza o SLO correspondente no seu provedor de observabilidade.

**Vantagens:**
- O SLO vive no mesmo repositório que o serviço — é versionado, revisado em PR, rastreável
- Não há configuração manual duplicada (Kubernetes + observabilidade)
- Mudanças propostas pelo ARIA passam por aprovação humana antes de ser aplicadas

---

## Declarando um SLO

Adicione um recurso do tipo `SLOConfig` no namespace do seu serviço:

```yaml
apiVersion: titlis.io/v1alpha1
kind: SLOConfig
metadata:
  name: checkout-availability
  namespace: payments
spec:
  service: checkout-api
  displayName: "Checkout — Disponibilidade"
  type: availability
  target: 99.9
  window: 30d
  tags:
    env: production
    team: payments
```

### Campos principais

| Campo | Descrição |
|---|---|
| `spec.service` | Nome do serviço no provedor de observabilidade |
| `spec.displayName` | Nome legível exibido na plataforma e no painel do provedor |
| `spec.type` | Tipo do SLO: `availability`, `latency`, `error_rate` |
| `spec.target` | Meta em porcentagem (ex: `99.9` = 99,9%) |
| `spec.window` | Janela de avaliação: `7d`, `30d`, `90d` |
| `spec.tags` | Tags para organização no provedor |

Após aplicar o manifest (`kubectl apply -f slo.yaml`), o operator detecta o recurso e
o sincroniza com a plataforma em até 2 minutos.

---

## Estados de um SLO

| Estado | Significado |
|---|---|
| **OK** | SLO está sendo cumprido dentro da meta |
| **AT_RISK** | O error budget está sendo consumido mais rápido que o esperado |
| **BREACHED** | A meta foi violada na janela atual |
| **UNKNOWN** | Dados insuficientes ou sincronização pendente |

A tela **SLOs** exibe todos os SLOs do tenant com seu estado atual, a meta configurada
e quando foi a última sincronização.

---

## Propor mudanças via ARIA

Você pode pedir ao ARIA para propor alterações em um SLO — por exemplo, ajustar o target
ou a janela de avaliação:

> *"Proponha aumentar o target do SLO checkout-availability de 99.9 para 99.95"*

O ARIA cria uma proposta de mudança que:
1. Aparece como pendente na tela de SLOs
2. Aguarda aprovação de um Admin
3. Após aprovação, o operator atualiza o CRD no cluster
4. O provedor de observabilidade é atualizado automaticamente

Nenhuma mudança de SLO é aplicada sem aprovação humana.

---

## Sincronização com Datadog

Se sua organização usa Datadog, o Titlis cria e atualiza SLOs diretamente na sua conta
Datadog. A configuração de credenciais é feita pelo Admin em
**Configurações → Configurar ARIA** (seção de integrações).

O Titlis nunca remove SLOs do Datadog — apenas cria e atualiza. Para excluir um SLO,
remova o `SLOConfig` do cluster e delete manualmente no Datadog.

---

## Dúvidas comuns

**Posso criar SLOs direto na interface sem editar YAML?**
Não no momento. O modelo do Titlis é "SLO como código" — a fonte de verdade é o repositório.
O ARIA pode ajudá-lo a gerar o YAML correto via chat.

**O que acontece se eu alterar o target diretamente no Datadog?**
O Titlis vai sobrescrever com o valor do `SLOConfig` no próximo ciclo de sincronização.
Sempre faça alterações no CRD Kubernetes.

**Posso ter SLOs em clusters diferentes para o mesmo serviço?**
Sim. Cada `SLOConfig` é identificado pela combinação `(nome, namespace, cluster)`.
Dois SLOs com o mesmo nome em clusters diferentes são tratados como recursos independentes.
