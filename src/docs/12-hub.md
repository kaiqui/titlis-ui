# Hub de serviços

O **Hub** é a página inicial do Titlis. Ele organiza tudo na hierarquia
**Produto → Squad → Serviço → Workload**, com o score de cada nível, para você navegar do
panorama executivo até a aplicação.

---

## De onde vem a estrutura

- **Produto, Squad, Serviço** vêm do **`.titlis/service.yaml`** de cada repositório
  (ver [.titlis/service.yaml](/docs/service-yaml)).
- **Workloads e filas** vêm do **Discovery** (o operator descobre o cluster) e são
  correlacionados ao serviço pelos padrões declarados no `service.yaml`.
- **O score** de cada serviço vem da **[Cobertura](/docs/cobertura)** (Trust Score).

> A estrutura não é cadastrada manualmente no Titlis — ela **emerge** do que está declarado nos
> repositórios + do que é descoberto no cluster.

---

## O balde de órfãos ("sem dono")

Workloads e filas descobertos que **ainda não têm** um `service.yaml` correspondente aparecem
num **balde de órfãos**. Ele é o **driver de adoção**: mostra exatamente o que falta declarar
para organizar o estate. Conforme você adiciona `service.yaml` aos repos, os itens saem do balde
e passam para o produto/squad correto.

---

## Como usar

- **Cartões de topo:** contagem de Produtos, Squads, Serviços e Órfãos.
- **Navegação:** clique para descer Produto → Squad → Serviço → Workload.
- **Tema:** o seletor Claro/Escuro fica no topo, como nas demais páginas.

Para o detalhamento por **débito de confiabilidade** (com drill-down até o finding e correção),
use a página **[Confiabilidade](/docs/confiabilidade)**.
