# Confiabilidade (termômetro com drill-down)

A página **Confiabilidade** é o termômetro do estate ponderado por **débito**. Você navega de
cima (Estate → Produto → Squad → Serviço) até as **aplicações e filas**, e de lá até os
**findings** e a correção.

---

## Como o débito funciona

Cada folha (workload/fila) tem um score (Trust Score da [Cobertura](/docs/cobertura)). O **débito**
é `peso × (100 − score)`, e o **peso vem do `tier`** do serviço (tier-1 pesa mais). Os nós são
ordenados por débito — **começar pelo topo dá o maior ganho de confiabilidade**.

- **RI (índice de confiabilidade):** o score agregado do nó.
- **Piso crítico:** uma folha **tier-1** abaixo do limite acende o alerta de piso crítico no caminho.

---

## Drill-down até a aplicação

Descendo Produto → Squad → Serviço, ao chegar num **serviço** você vê:
- **Aplicações** — os workloads do serviço (seção própria).
- **Filas** — as filas correlacionadas ao serviço (seção própria, separada das aplicações).
- **Correções priorizadas** — os findings das folhas, ordenados pelos pontos de confiabilidade
  recuperáveis ao corrigir.

Tudo é distinguido visualmente: ícone por tipo (workload × fila), e os nós **sem dono** (sem
`service.yaml`) ganham o selo **"sem dono"**.

---

## Com dono × sem dono

- **Com dono:** serviços declarados em [`.titlis/service.yaml`](/docs/service-yaml) aparecem sob
  seu Produto → Squad.
- **Sem dono:** workloads/filas descobertos sem `service.yaml` caem no balde **"(sem dono)"**.
  Declarar o `service.yaml` é o que os move para o lugar certo e dá dono a eles.

---

## Corrigir

Nos findings remediáveis, **Corrigir com ARIA** abre o fluxo de remediação (PR unitário, com
aprovação humana). Veja [ARIA](/docs/assistente-ia). O destino do PR vem do `gitops.paths` do
`service.yaml`.
