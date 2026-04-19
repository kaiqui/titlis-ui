# CLAUDE.md — titlis-ui

> Após toda alteração: `npm run build` deve passar (check:auth-env + tsc + vite).
> Para desenvolvimento: `npm run dev`. Testes: `npm test`.

---

## 1. Stack

| Categoria | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19.2.0 |
| Build | Vite | 7.3.1 |
| Linguagem | TypeScript (strict) | 5.9.3 |
| CSS | Tailwind CSS | 4.2.1 |
| Roteamento | React Router DOM | 7.13.1 |
| Server state | TanStack Query (React Query) | 5.90.21 |
| Auth OIDC | @okta/okta-auth-js + okta-react | 8.0.0 / 6.11.0 |
| UI Primitives | Radix UI (Avatar, Dialog, Dropdown, Select, Tabs, Tooltip, etc.) | latest |
| Ícones | lucide-react | 0.577.0 |
| Gráficos | Recharts | 3.7.0 |
| Animações | Framer Motion | 12.35.0 |
| Busca | fuse.js | 7.1.0 |
| Markdown | react-markdown + remark-gfm | 10.1.0 |
| Testes | Vitest + @testing-library/react | 3.2.4 |

---

## 2. Estrutura de Diretórios

```
src/
├── App.tsx                  # Providers + Router com todas as rotas
├── main.tsx                 # ReactDOM.createRoot + QueryClient
├── index.css                # Tailwind globals + CSS variables de tema
│
├── pages/                   # Um arquivo por rota
│   ├── Dashboard.tsx        # / — visão geral com 4 focos
│   ├── Applications.tsx     # /applications — lista + filtros + detail panel
│   ├── ApplicationDetail.tsx# /applications/:id — scorecard completo
│   ├── Scorecards.tsx       # /scorecards
│   ├── ScorecardDetail.tsx  # /scorecards/:id e /applications/:id/scorecard
│   ├── Incidents.tsx        # /incidents
│   ├── SLOs.tsx             # /slos
│   ├── Recommendations.tsx  # /recommendations (admin only)
│   ├── Squads.tsx           # /topology
│   ├── Login.tsx            # /login
│   ├── LoginCallback.tsx    # /login/callback (OKTA redirect)
│   ├── Onboarding.tsx       # /signup
│   └── SettingsAuth.tsx     # /settings/auth (admin only)
│
├── components/
│   ├── atoms/               # Primitivos simples: button, input, img, typography
│   ├── auth/
│   │   └── AuthGate.tsx     # HOC de proteção de rotas
│   ├── jeitto/              # Design system do produto
│   │   ├── ButtonDefault.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── InfoTip.tsx
│   │   ├── Input.tsx
│   │   ├── MetricCard.tsx
│   │   ├── PageHero.tsx
│   │   ├── PageState.tsx    # PageLoading + PageError
│   │   ├── ScoreBadge.tsx   # Badge colorida por score
│   │   ├── ScoreRing.tsx    # Anel SVG de score
│   │   ├── SectionIntro.tsx
│   │   └── Typography.tsx
│   ├── layout/
│   │   ├── Layout.tsx       # Shell: Sidebar + Header + <Outlet>
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ApiStatus.tsx
│   ├── molecule/            # Componentes compostos: accordion, carousel, tabs, forms
│   ├── sre/                 # Componentes específicos de SRE
│   │   ├── DetailPanel.tsx  # Painel lateral de detalhes
│   │   ├── FocusTabs.tsx    # Tabs de foco (incidentes/workloads/remediação/cobertura)
│   │   ├── InlineAccordion.tsx
│   │   ├── SelectionList.tsx
│   │   └── SummaryStrip.tsx # Faixa de métricas resumo
│   └── sections/            # Seções de página (carousel, forms, imagens)
│
├── contexts/
│   ├── AuthContext.tsx      # Estado de auth + métodos de login/logout
│   ├── useAuth.ts           # Hook: useAuth()
│   ├── ThemeContext.tsx     # Tema dark/light
│   └── useTheme.ts          # Hook: useTheme()
│
├── hooks/
│   └── useApi.ts            # Hooks React Query: useDashboardWorkloads, useWorkloadScorecard, etc.
│
├── lib/
│   ├── api.ts               # Cliente HTTP único — todos os endpoints mapeados
│   ├── auth.ts              # Tipos e helpers de autenticação
│   ├── okta.ts              # OktaAuth SDK (PKCE, token renewal)
│   ├── incidents.ts         # Lógica de construção de incidentes
│   ├── insights.ts          # Lógica de construção de insights
│   └── utils.ts             # formatDate(), formatScore(), cn() (clsx + twMerge)
│
├── types/
│   └── index.ts             # Todos os tipos compartilhados (WorkloadSummary, Finding, etc.)
│
└── utils/
    ├── checkMobile.ts
    ├── crypto.ts
    └── search-utils.ts
```

---

## 3. Rotas

| Path | Componente | Auth | Admin | Descrição |
|---|---|---|---|---|
| `/login` | Login | não | não | Login local + botão OKTA |
| `/login/callback` | LoginCallback | não | não | Callback OKTA OAuth |
| `/signup` | Onboarding | não | não | Criação do primeiro tenant |
| `/getting-started` | GettingStarted | não | não | Onboarding pós-cadastro: guia de instalação do operator com polling de conexão e dados |
| `/` | Dashboard | sim | não | 4 focos: incidentes, workloads, remediação, cobertura |
| `/incidents` | Incidents | sim | não | Lista de incidentes |
| `/scorecards` | Scorecards | sim | não | Lista de scorecards |
| `/scorecards/:id` | ApplicationDetail | sim | não | Detalhe de scorecard |
| `/applications` | Applications | sim | não | Lista + filtros + detail panel |
| `/applications/:id` | ApplicationDetail | sim | não | Detalhe de workload |
| `/applications/:id/scorecard` | ScorecardDetail | sim | não | Scorecard de workload |
| `/slos` | SLOs | sim | não | Catálogo de SLOs |
| `/recommendations` | Recommendations | sim | **sim** | Fila de remediação |
| `/topology` | Squads | sim | não | Topologia de squads |
| `/settings/auth` | SettingsAuth | sim | **sim** | Config de providers OIDC |

**Proteção de rotas:** `<AuthGate>` em torno de todas as rotas autenticadas.
`<AuthGate requireAdmin>` para admin-only (redireciona para `/` se não for admin).

---

## 4. Auth Context

**Arquivo:** `src/contexts/AuthContext.tsx`

### Estado
```typescript
type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null       // { id, tenantId, tenantSlug, email, displayName, role, canRemediate }
  session: AuthSession | null // { provider, accessToken, expiresAt, idToken? }
  authMode: string            // VITE_AUTH_MODE: 'okta' | 'mock'
  bootstrapStatus: BootstrapStatus | null
  loginLocal(payload): Promise<void>
  loginWithOkta(): Promise<void>
  finishOktaLogin(): Promise<void>
  bootstrapSetup(payload): Promise<void>
  refreshSession(): Promise<void>
  signOut(): Promise<void>
}
```

### Fluxo de inicialização
```
App monta → AuthProvider → refreshSession()
  ├── Lê localStorage 'titlis.auth.session'
  ├── Se token Okta: OktaAuth.tokenManager.renew() se expirado
  ├── Se token local: valida exp
  ├── Se bootstrapRequired: redireciona para /signup
  └── Se válido: status = 'authenticated'
```

### Mock mode (VITE_AUTH_MODE=mock)
Cria sessão sintética com variáveis VITE_DEV_*. Só funciona com `VITE_APP_ENV=local`.

---

## 5. API Client

**Arquivo:** `src/lib/api.ts`

### Função base
```typescript
async function request<T>(path: string, options?: RequestInit & { optional?: boolean }): Promise<T>
```
- URL base: `import.meta.env.VITE_API_URL` (padrão `http://localhost:8080/v1`)
- Adiciona `Authorization: Bearer <token>` de `localStorage`
- Em mock mode: adiciona `X-Dev-Auth`, `X-Dev-Tenant-Id`, `X-Dev-User`, `X-Dev-Roles`
- `optional: true` → 404 retorna `null` em vez de lançar erro

### Namespaces disponíveis
```typescript
api.auth.bootstrapStatus()
api.auth.bootstrapSetup(payload)
api.auth.loginLocal(payload)
api.auth.me()

api.authSettings.listProviders()
api.authSettings.upsertProvider(payload)
api.authSettings.verifyProvider(id)
api.authSettings.activateProvider(id)
api.authSettings.deactivateProvider(id)

api.dashboard.list(cluster?)
api.workloads.scorecard(id)
api.workloads.remediation(id)
api.slos.list(filters)
api.slos.lookup(namespace, name)

api.apiKeys.list()
api.apiKeys.create(description?)
api.apiKeys.revoke(id)
api.apiKeys.connectionStatus()
  // → { connected: boolean, lastEventAt: string | null, activeKeyCount: number }
  // connected=true quando ao menos uma chave do tenant foi usada pelo operator
```

### React Query hooks (`src/hooks/useApi.ts`)
```typescript
useDashboardWorkloads(cluster?)      // staleTime: 30s, retry: 1, refetchOnWindowFocus: false
useWorkloadScorecard(id)
useWorkloadRemediation(id)
useSloCatalog(namespace?, cluster?)
useSloLookup(namespace, name, enabled)
```

---

## 6. Tipos Principais

**Arquivo:** `src/types/index.ts`

```typescript
// Workload na lista do dashboard
interface WorkloadSummary {
  id: string
  name: string
  namespace: string
  cluster: string
  overallScore: number | null
  complianceStatus: 'compliant' | 'non_compliant' | 'unknown' | 'pending'
  findings: Finding[]
  pillars: PillarScore[]
  remediation: RemediationStatus | null
}

// Finding individual de scorecard
interface Finding {
  ruleId: string        // ex: "RES-001"
  pillar: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  passed: boolean
  message: string
  actual?: string
  expected?: string
}

// Score por pilar
interface PillarScore {
  name: string          // resilience | security | cost | performance | operational | compliance
  score: number
  passedChecks: number
  totalChecks: number
}
```

---

## 7. Sistema de Temas

**CSS variables** em `src/index.css` para dark/light mode:
```css
:root {
  --app-background: ...;
  --color-primary: ...;
  --color-primary-soft: ...;
  --color-foreground: ...;
  --color-muted-foreground: ...;
  --color-card: ...;
  --color-border: ...;
}
.dark { /* override */ }
```

**Uso:** Use as variáveis CSS diretamente ou `bg-[var(--color-card)]` no Tailwind.

### Score → cor
```typescript
// src/lib/utils.ts
getScoreColor(score: number): string
// >= 90: green, >= 80: amber, >= 70: orange, < 70: red
```

---

## 8. Variáveis de Ambiente

```bash
# API
VITE_API_URL=http://localhost:8080/v1

# Ambiente
VITE_APP_ENV=local          # local | dev | staging | production

# Auth
VITE_AUTH_MODE=mock          # mock (dev) | okta (prod)

# OKTA (obrigatório se VITE_AUTH_MODE=okta)
VITE_OKTA_ISSUER=https://trial-xxx.okta.com/oauth2/ausXXX/.well-known/oauth-authorization-server
VITE_OKTA_CLIENT_ID=xxx
VITE_OKTA_AUDIENCE=api://titlis
VITE_OKTA_REDIRECT_URI=http://localhost:13000/login/callback
VITE_OKTA_POST_LOGOUT_REDIRECT_URI=http://localhost:13000/login

# Dev bypass (apenas VITE_AUTH_MODE=mock)
VITE_DEV_TENANT_ID=1
VITE_DEV_TENANT_SLUG=dev-tenant-1
VITE_DEV_TENANT_NAME=Tenant 1
VITE_DEV_USER_EMAIL=dev@titlis.local
VITE_DEV_USER_NAME=Dev Bypass
VITE_DEV_ROLES=titlis.admin
```

**Validação de build:** `scripts/auth-env-guard.mjs` — se `VITE_AUTH_MODE=okta`, verifica que
`VITE_OKTA_ISSUER` e `VITE_OKTA_CLIENT_ID` estão definidos. O build falha se não estiverem.

---

## 9. Comandos

```bash
npm run dev          # Dev server (Vite HMR em localhost:13000)
npm run build        # check:auth-env + tsc -b + vite build
npm run lint         # ESLint com TypeScript
npm run test         # Vitest (run mode, não watch)
npm run preview      # Preview do build de produção
```

**Antes de commit:** `npm run build` deve passar sem erros TypeScript.

**Docker:**
```bash
docker build -t kailima/titlis-ui:latest .
# Multi-stage: node:22-alpine (build) → nginx:alpine (serve)
# Nginx faz proxy de /v1/* para titlis-api:8080
# SPA fallback: 404 → index.html (React Router)
```

---

## 10. Convenções de Código

### Componentes
- PascalCase, um componente por arquivo, arquivo com mesmo nome do componente
- Props tipadas com `interface` explícita (nunca `any`)
- Sem default props — use valores padrão em destructuring

### Hooks
- Prefixo `use`, camelCase
- Hooks de dados sempre usam React Query (não `useEffect` + `useState` para API calls)
- Lógica derivada com `useMemo`, busca com `useDeferredValue`

### API calls
- **Nunca** chame `fetch()` diretamente em componentes — use `api.*` ou hooks de `useApi.ts`
- Mapeamento de resposta da API → tipo frontend fica em `lib/api.ts` (funções `map*`)

### Estilo
- Tailwind para tudo; use `cn()` (`clsx` + `twMerge`) para classes condicionais
- Sem CSS modules, sem styled-components
- CSS variables para cores do tema

### Formulários
- State local com `useState` + validação com `useMemo`
- Desabilita submit enquanto formulário é inválido
- Mensagens de erro abaixo do campo

### Internacionalização
- Interface 100% em PT-BR
- Datas com `formatDate()` de `lib/utils.ts` (locale `'pt-BR'`)
- Sem biblioteca de i18n — strings hardcoded em português

---

## 11. Design System (Jeitto)

Componentes em `src/components/jeitto/` — use-os para construir novas páginas:

| Componente | Uso |
|---|---|
| `<PageHero>` | Cabeçalho de página com título e subtítulo |
| `<Card>` | Container com borda e header opcional |
| `<MetricCard>` | Card para exibir uma métrica com label |
| `<ScoreBadge score={82}>` | Badge colorida com número de score |
| `<ScoreRing score={82}>` | Anel SVG circular de score |
| `<EmptyState>` | Estado vazio com ícone, título e descrição |
| `<PageLoading>` | Spinner de carregamento de página |
| `<PageError>` | Exibição de erro com mensagem |
| `<InfoTip>` | Tooltip informativo com ícone |
| `<SectionIntro>` | Título de seção |

Componentes SRE em `src/components/sre/`:

| Componente | Uso |
|---|---|
| `<FocusTabs>` | Tabs para alternar foco (Dashboard) |
| `<SummaryStrip>` | Faixa horizontal de métricas |
| `<SelectionList>` | Lista selecionável com badges |
| `<DetailPanel>` | Painel lateral de detalhes |
| `<InlineAccordion>` | Seção expansível |

---

## 12. Assistente de IA

O titlis-ai expõe dois fluxos SSE consumidos pela UI: **explicação** (streaming de texto)
e **remediação** (pipeline multi-step com confirmação humana).

### Endpoints consumidos

```typescript
// Proxied via titlis-api → titlis-ai
POST /v1/ai/workloads/{id}/explain         // SSE stream: chunks de markdown
POST /v1/ai/workloads/{id}/remediate       // SSE stream: fix_ready | existing_pr | progress | error | done
POST /v1/ai/remediate/{thread_id}/confirm  // SSE stream: pr_created | progress | done
```

### Fluxo de explicação ("Explicar com IA")

1. Usuário clica "Explicar com IA" num finding com `passed: false`
2. UI faz `POST /v1/ai/workloads/{id}/explain` com `{ rule_id, actual_value, ... }`
3. Lê SSE stream e renderiza chunks em markdown progressivamente
4. Painel lateral (`<DetailPanel>`) exibe a resposta

### Fluxo de remediação ("Corrigir com IA")

1. Usuário clica "Corrigir com IA" num finding com `is_remediable: true`
2. UI faz `POST /v1/ai/workloads/{id}/remediate` com `{ finding_ids, repo_url, deploy_manifest_path }`
3. Lê SSE stream:
   - `existing_pr` → mostra link do PR já existente
   - `progress` → atualiza status de cada nó do pipeline
   - `fix_ready` → exibe diff (`patched_manifest` vs `current_manifest`) e botões Confirmar/Rejeitar
4. Ao confirmar, UI faz `POST /v1/ai/remediate/{thread_id}/confirm` com `{ approved: true }`
5. Lê SSE stream: `pr_created` → exibe link do PR criado

### Tipos de evento SSE

| `type` | Ação na UI |
|---|---|
| `fix_ready` | Para stream; exibe diff; aguarda usuário (guarda `thread_id`) |
| `existing_pr` | Exibe link do PR existente; encerra fluxo |
| `progress` | Exibe nome do nó atual em execução |
| `pr_created` | Exibe link do PR criado (pr_url, pr_number) |
| `error` | Exibe mensagem de erro e encerra |
| `done` | Limpa loading state |

### Configuração de AI (admin)

Página `SettingsAuth` ou nova aba — admin configura por tenant:
- `provider`: openai | anthropic | google | mistral
- `model`: gpt-4o | claude-3-5-sonnet | etc.
- `api_key` (write-only — nunca exibida)
- `github_token` (write-only)
- `github_base_branch`
- `monthly_token_budget` (opcional)

Badge na UI mostra o provider configurado ou CTA para configurar (se não admin: oculta botões de IA).

### Convenções de implementação

- Leia SSE com `EventSource` ou `fetch()` + `ReadableStream` — não use WebSocket
- Nunca armazene `api_key` ou `github_token` no state da UI — são write-only
- `canRemediate` (derivado do role) controla visibilidade dos botões "Corrigir com IA"
- O `thread_id` vem do evento `fix_ready` — guarde em `useState` para o confirm posterior

---

## 13. O Que Não Fazer

- **Nunca** use `useEffect` para buscar dados de API — use React Query
- **Nunca** armazene tokens em `sessionStorage` — o padrão é `localStorage` com chave `titlis.auth.session`
- **Nunca** exiba `VITE_AUTH_MODE=mock` em produção — `auth-env-guard.mjs` bloqueia no build
- **Nunca** use `any` no TypeScript sem justificativa explícita em comentário
- **Nunca** adicione docstrings/JSDoc em funções que não precisam de explicação
- **Nunca** faça chamadas diretas a `fetch()` — sempre passe pelo `api.*` client
- **Nunca** adicione traduções em inglês na UI — todo texto visível é PT-BR
