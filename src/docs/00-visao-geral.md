# Visão Geral

O Titlis é uma plataforma SRE de governança de workloads Kubernetes. Ele monitora
continuamente seus serviços, calcula um score de confiabilidade para cada um e oferece
ferramentas para corrigir automaticamente o que está fora dos padrões — sem que sua equipe
precise revisar checklist manualmente a cada deploy.

---

## O que o Titlis faz

**Avalia seus workloads** contra um conjunto de regras organizadas em pilares (Resiliência,
Segurança, Performance, Operacional). O resultado é um score de 0 a 100 que você vê em
tempo real no dashboard.

**Abre PRs de correção** quando detecta problemas. O fluxo pode ser unitário (um serviço
de cada vez, via ARIA) ou em frota (dezenas de serviços de uma vez, via Campanhas).

**Sincroniza SLOs** definidos como código no seu repositório com o seu provedor de
observabilidade — sem precisar configurar manualmente em dois lugares.

**Sugere ajustes de HPA** com base em métricas reais de uso de CPU e memória dos seus
workloads, não em valores genéricos.

**Responde perguntas sobre sua infra** via ARIA, o assistente conversacional que conhece
o estado atual de todos os seus workloads e pode propor e executar ações com sua aprovação.

---

## Glossário

| Termo | Significado |
|---|---|
| **Workload** | Um Deployment Kubernetes monitorado pela plataforma |
| **Scorecard / Termômetro** | O resultado da avaliação de um workload: score + lista de findings |
| **Finding** | Um problema específico detectado em um workload (ex: sem liveness probe) |
| **Pilar** | Categoria de regras (Resiliência, Segurança, Performance, Operacional) |
| **Remediação** | Correção automática de um finding via PR no repositório do workload |
| **Campanha** | Remediação aplicada em múltiplos workloads ao mesmo tempo |
| **SLO** | Service Level Objective — meta de disponibilidade ou latência de um serviço |
| **HPA** | Horizontal Pod Autoscaler — controla a escala automática de réplicas |
| **Operator** | Componente instalado no seu cluster Kubernetes que envia dados para a plataforma |
| **ARIA** | Assistente de IA conversacional integrado à plataforma |

---

## Fluxo básico do usuário

```
Cluster Kubernetes
      │
      │  Operator instalado no cluster
      │  (monitora Deployments e HPAs)
      ▼
Plataforma Titlis
      │
      ├── Scorecard atualizado a cada ciclo
      │       └── Findings detectados
      │
      ├── Sugestões de HPA (com base em métricas reais)
      │
      ├── SLOs sincronizados automaticamente
      │
      └── ARIA disponível para perguntas e remediações
                └── Abre PR no seu repositório
                        └── Você revisa e faz merge
```

O Titlis **nunca faz merge** de nenhum PR. Toda alteração no código passa pelo seu fluxo
normal de revisão.

---

## Papéis e permissões

| Papel | O que pode fazer |
|---|---|
| **Admin** | Acesso total: configurações, integrações, recomendações, score config |
| **Engineer** | Leitura de scorecards, acesso ao ARIA, pode solicitar remediações |
| **PM** | Dashboard e métricas gerais |
| **Viewer** | Leitura de todos os dados, sem ações |

---

## Próximos passos

- [Primeiros Passos](/docs/primeiros-passos) — instale o operator e conecte seu cluster
- [Scorecards](/docs/scorecards) — entenda como ler o termômetro de confiabilidade
- [ARIA](/docs/assistente-ia) — use o assistente para explorar e corrigir sua infra
