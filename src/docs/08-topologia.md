# Topologia — Squads, Namespaces e Tags

A tela de Topologia permite organizar seus workloads por times (squads), excluir
namespaces de infra do monitoramento e adicionar tags para filtros e agrupamentos
em todas as telas da plataforma.

---

## Squads

Squads representam times de engenharia responsáveis por conjuntos de workloads.
Organizar workloads em squads facilita:

- Ver o score médio de um time no dashboard
- Filtrar scorecards por squad
- Direcionar campanhas para um time específico
- Entender a cobertura de conformidade por squad

### Criando um squad

1. Acesse **Topologia**
2. Clique em **Novo squad**
3. Informe o nome do squad e os namespaces que ele é responsável
4. Salve

Os workloads dos namespaces adicionados passam a aparecer agrupados sob o squad.

### Adicionando workloads a um squad manualmente

Se um squad é responsável por workloads em namespaces mistos (onde outros squads
também têm workloads), você pode adicionar workloads individualmente:

1. Na tela de detalhe do squad, clique em **Adicionar workload**
2. Busque pelo nome e selecione

---

## Namespaces

A tela de Topologia exibe todos os namespaces detectados pelo operator, com a quantidade
de workloads em cada um.

### Excluir um namespace do monitoramento

Namespaces de sistema (ex: `kube-system`, `monitoring`, `cert-manager`) geram ruído
nos scorecards. Para excluí-los:

1. Na lista de namespaces, clique no namespace desejado
2. Marque **Excluído do monitoramento**
3. Confirme

Workloads em namespaces excluídos não aparecem no Termômetro de Confiabilidade,
no dashboard nem em campanhas.

> **Atenção:** a exclusão é lógica — os dados históricos são preservados. Você pode
> reativar o namespace a qualquer momento.

---

## Tags

Tags são pares chave-valor que você pode associar a workloads, namespaces ou squads.
Elas servem para filtros e agrupamentos em toda a plataforma.

### Exemplos de tags úteis

| Chave | Valor | Uso |
|---|---|---|
| `env` | `production`, `staging`, `dev` | Filtrar por ambiente |
| `team` | `payments`, `identity`, `platform` | Filtrar por time (alternativa a squads) |
| `tier` | `critical`, `standard`, `experimental` | Priorizar remediações |
| `language` | `java`, `python`, `go` | Análises por stack tecnológico |

### Gerenciando tags

Acesse **Configurações → Tags** (acesso Admin) para:
- Criar novas tags disponíveis para uso
- Associar tags a namespaces (aplicadas em todos os workloads do namespace)
- Remover tags obsoletas

---

## Visão de cluster

A Topologia também exibe uma visão dos clusters conectados:

- Nome do cluster e versão do Kubernetes
- Quantos namespaces e workloads monitorados
- Última vez que o operator se comunicou com a plataforma
- Status da conexão

Se um cluster aparece como "Desconectado" por mais de 10 minutos, verifique os logs
do operator e o status da chave de API em **Configurações → Chaves de API**.

---

## Dúvidas comuns

**Squads são obrigatórios?**
Não. Você pode usar a plataforma sem criar squads. Eles são opcionais e úteis quando
você tem múltiplos times usando a mesma conta.

**Um workload pode pertencer a mais de um squad?**
Não. Cada workload pertence a no máximo um squad. Se você tentar adicioná-lo a um segundo
squad, ele é removido do primeiro.

**Tags propagam para workloads novos automaticamente?**
Tags aplicadas a um namespace se propagam para todos os workloads do namespace,
incluindo novos deployments detectados após a tag ser criada.

**Posso importar squads do Backstage?**
Quando a integração com Backstage está configurada, os squads e owners declarados no
catálogo do Backstage são importados automaticamente.
Veja [Integrações](/docs/integracoes).
