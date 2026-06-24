# ARIA — Assistente de IA

ARIA é a camada de IA do Titlis. Ela conhece o contexto do seu serviço (findings de cobertura,
SLOs, histórico de remediações, o manifesto no GitHub) e atua em **dois pontos**, sempre com
**aprovação humana**:

1. **Explicar com IA** — explica um finding em linguagem clara.
2. **Corrigir com IA** — propõe e abre um **PR unitário** de correção.

> **Sem chat conversacional por enquanto.** No momento a ARIA não tem uma tela de chat para
> "perguntar" — ela é acionada pelos botões de **Explicar** e **Corrigir** dentro dos scorecards.
> Os findings continuam **determinísticos** (gerados por regras na Cobertura); a ARIA **explica e
> corrige**, nunca inventa achados.

---

## Pré-requisitos (admin)

Em **Configurar ARIA / Integrações**:
- **Provedor de LLM** (provider + modelo + API key) — necessário para Explicar e Corrigir.
- **Token do GitHub** — necessário para a ARIA abrir PRs de correção.

Sem o provedor de LLM, os botões de IA ficam indisponíveis. Sem o token do GitHub, a ARIA explica
mas não consegue abrir PR.

---

## Explicar com IA

Em um finding (no detalhe de **[Cobertura](/docs/cobertura)** ou nas correções priorizadas da
**[Confiabilidade](/docs/confiabilidade)**), clique em **Explicar com IA**. A ARIA abre um painel e
**transmite a explicação em tempo real**: o que a regra verifica, por que importa e como costuma
ser resolvida — contextualizada com o estado real do seu serviço.

---

## Corrigir com IA

Nos findings **remediáveis**, **Corrigir com IA** dispara o fluxo de remediação:

1. A ARIA lê o manifesto do serviço no GitHub (caminho/branch vêm do `gitops.paths` do
   **[.titlis/service.yaml](/docs/service-yaml)**) e gera um **patch unitário**.
2. Você revê o **diff proposto** e **confirma** — nada é aplicado sem o seu aval (human-in-the-loop).
3. Confirmado, a ARIA abre um **Pull Request** com a correção.

**Garantias:**
- **PR unitário** — uma correção por vez, fácil de revisar.
- **Aprovação humana** obrigatória antes de criar o PR.
- **Never-reduce** — a automação **nunca reduz** CPU, memória ou réplicas; só sugere aumentos/ajustes seguros.

Acompanhe os PRs abertos em **Fila de PRs** (`/recommendations`).

---

## Onde a ARIA aparece

| Ação | Onde |
|---|---|
| Explicar com IA | finding no detalhe de Cobertura / nas correções da Confiabilidade |
| Corrigir com IA | finding remediável (mesmos lugares) |
| Fila de PRs | `/recommendations` — acompanhar os PRs criados |

---

## Dúvidas comuns

**Posso conversar com a ARIA?**
Por enquanto não — a tela de chat não está disponível. A ARIA atua pelos botões **Explicar** e
**Corrigir**. Quando o chat voltar, esta página será atualizada.

**A ARIA pode aplicar mudanças sozinha?**
Não. Toda correção passa por confirmação humana e vira um PR — quem faz o merge é você.

**Quais findings a ARIA corrige?**
Os marcados como remediáveis (correções YAML seguras). Sinais que dependem de fonte externa não
mensurável aparecem como N/A na Cobertura e não geram correção.
