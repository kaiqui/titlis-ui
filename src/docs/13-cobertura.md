# Cobertura & Confiança (Service Scorecard)

A **Cobertura** é o scorecard de serviço do Titlis — a evolução do antigo "Termômetro de
Confiabilidade". Em vez de uma lista única de regras igual para todos, cada serviço recebe um
**scorecard personalizado pela sua natureza** (linguagem, se é HTTP-facing, criticidade,
sinais disponíveis).

> Determinístico: os findings são gerados por **regras**, nunca por IA. A ARIA apenas **narra** e
> ajuda a corrigir — ela não inventa achados.

---

## Conceitos

### Trust Score (0–100)
A razão ponderada de itens **aprovados** sobre os **avaliáveis** (exclui os N/A). É o número que
aparece no Hub e na Confiabilidade.

### Maturidade (1–5)
O **elo mais fraco** entre as dimensões avaliáveis — um serviço só é maduro se nenhuma dimensão
ficar para trás.

### N/A não é falha (capability-gating)
Se um sinal **não é mensurável** para aquele serviço (ex.: não há monitor/trace/métrica para
avaliar), o item vira **N/A** — nunca "faltando". Isso evita punir o serviço por algo que não dá
para medir no contexto dele.

### Três desfechos por item
- **pass** — boa prática atendida
- **fail** — oportunidade de melhoria (entra no débito)
- **N/A** — não mensurável / não aplicável

---

## De onde vêm os dados

A Cobertura depende do **Discovery** (o operator descobre o grafo de ativos do cluster + Datadog).
Ative com `ENABLE_DISCOVERY` no operator. A titlis-api monta um *snapshot* por serviço a partir do
grafo, o titlis-scoreops aplica os templates por natureza e devolve o scorecard.

---

## Na tela

- **Trust médio / pior caso** e **maturidade** do estate no topo.
- **Top-10 riscos** — serviços com menor Trust Score primeiro.
- **Tabela de serviços** — Trust, maturidade e nº de lacunas (inclui serviços sem dono).
- **Detalhe do serviço** — pilares + itens pass/fail/N/A, **Correlações** (vizinhança no grafo),
  e os botões **Explicar com ARIA** / **Corrigir com ARIA** nos itens remediáveis.

A Cobertura é a fonte do score exibido no **[Hub](/docs/hub)** e na
**[Confiabilidade](/docs/confiabilidade)**.
