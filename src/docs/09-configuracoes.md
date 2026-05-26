# Configurações

As configurações da plataforma estão agrupadas em seções acessíveis pelo menu lateral,
em **Configurações**. A maioria das seções exige papel **Admin**.

---

## Chaves de API

**Onde:** Configurações → Chaves de API
**Acesso:** Admin

Chaves de API autenticam o operator instalado no seu cluster. Cada cluster deve ter
sua própria chave.

### Criando uma chave

1. Clique em **Nova chave**
2. Dê um nome descritivo (ex: `cluster-producao`, `cluster-staging-us`)
3. Copie a chave exibida — ela **não será mostrada novamente**
4. Use a chave na configuração do Helm chart do operator

### Status de conexão

A tela exibe, para cada chave:
- **Ativa / Inativa** — se a chave está habilitada
- **Último evento** — quando o operator com essa chave enviou dados pela última vez
- **Cluster** — nome do cluster identificado pelo operator

Se o campo **Último evento** estiver vazio ou com mais de 10 minutos, o operator pode
estar com problemas. Verifique os logs do pod do operator no cluster.

### Rotação de chave

Sempre crie a nova chave **antes** de revogar a antiga:

1. Crie nova chave
2. Atualize o Secret do operator no cluster com a nova chave
3. Aguarde o operator reconectar (verifique **Último evento**)
4. Revogue a chave antiga

---

## Configurar ARIA

**Onde:** Configurações → Configurar ARIA
**Acesso:** Admin

Para que o ARIA funcione como assistente e crie PRs de remediação, é necessário
configurar:

### Provider de IA

Selecione qual provider de LLM o ARIA vai usar e informe a API key correspondente.

> A API key é **write-only** — após salva, não é exibida novamente na interface por
> questões de segurança. Para atualizar, informe uma nova chave e salve.

### Token do GitHub

Informe um Personal Access Token (PAT) ou token de GitHub App com permissão de
escrita nos repositórios onde o ARIA deve criar PRs.

**Permissões mínimas necessárias no token:**
- `repo` (full) — para criar branches, commits e PRs em repositórios privados
- `workflow` — se seus repositórios usam GitHub Actions e o ARIA precisa disparar workflows

> O token é **write-only** — igual à API key, não é exibido após ser salvo.

### Verificando a configuração

Após salvar, use o botão **Testar conexão** para verificar se o ARIA consegue se comunicar
com o provider de IA. O status aparece na tela com o resultado do teste.

---

## Score & Regras

**Onde:** Configurações → Score & Regras
**Acesso:** Admin

Permite personalizar como o score é calculado para o seu contexto:

### Pesos dos pilares

Ajuste o peso de cada pilar (Resiliência, Segurança, Performance, Operacional) no
score global. O padrão é peso igual para todos.

Exemplo: se seu contexto prioriza segurança acima de tudo, você pode aumentar o peso
do pilar Segurança — workloads com problemas de segurança terão impacto maior no score.

### Ativar/desativar regras

Algumas regras podem não fazer sentido para todos os contextos. Por exemplo, se todos
os seus workloads são jobs batch sem tráfego HTTP, a regra de readiness probe pode
não ser aplicável.

1. Localize a regra na lista
2. Clique no toggle para desativá-la
3. Confirme — a desativação afeta todos os workloads do tenant

Regras desativadas aparecem como `skipped` nos scorecards, sem penalizar o score.

### Reimportar score

Após alterar pesos ou desativar regras, clique em **Recalcular scores** para reavaliar
todos os workloads com a nova configuração.

---

## Auto-Remediação

**Onde:** Configurações → Auto-Remediação
**Acesso:** Admin

Configura o comportamento padrão de PRs criados pelo ARIA e por campanhas.

### Branch padrão

Define em qual branch o PR é aberto (ex: `main`, `develop`).

### Reviewers automáticos

Lista de usuários do GitHub que são adicionados como reviewers em todos os PRs criados
pelo Titlis. Pode ser deixado em branco.

### Labels de PR

Labels do GitHub adicionadas automaticamente em todos os PRs. Útil para rastrear PRs
do Titlis no seu fluxo de trabalho (ex: `titlis`, `automated`, `sre`).

### Remediação automática (sem aprovação manual)

Quando habilitada, o ARIA pode criar PRs para correções de **baixo risco** sem exigir
que você confirme na interface. Apenas regras de severidade Low e algumas de Medium
se qualificam.

> **Use com cautela.** Mesmo em modo automático, o Titlis nunca faz merge — apenas
> cria o PR. Mas o volume de PRs pode aumentar significativamente.

---

## Tags

**Onde:** Configurações → Tags
**Acesso:** Admin

Gerencie o catálogo de tags disponíveis para uso na Topologia.

- **Criar tag:** defina chave e valores permitidos (ou deixe aberto para qualquer valor)
- **Arquivar tag:** remove do catálogo sem apagar dos workloads que já a usam
- **Chaves reservadas:** `env`, `team`, `cluster` são usadas pela plataforma — não arquive

---

## Autenticação e usuários

**Onde:** Configurações → Autenticação
**Acesso:** Admin

Configura o método de autenticação do tenant e gerencia usuários.

### Modos disponíveis

| Modo | Descrição |
|---|---|
| **Local** | Usuários e senhas gerenciados diretamente na plataforma |
| **SSO (Okta, OIDC)** | Login via provedor de identidade externo da organização |

Para configurar SSO, você precisa das credenciais do seu provedor OIDC:
- **Issuer URL** — URL do tenant do provedor (ex: `https://suaempresa.okta.com`)
- **Client ID** — ID da aplicação criada no provedor
- **Audience** — geralmente `api://titlis` ou conforme configurado no provedor

### Convidar usuários

Em modo local:
1. Clique em **Convidar usuário**
2. Informe e-mail e papel (Admin, Engineer, PM, Viewer)
3. O usuário recebe um e-mail com link para definir senha

Em modo SSO, usuários se autenticam diretamente pelo provedor. Os papéis são atribuídos
manualmente na plataforma após o primeiro login.
