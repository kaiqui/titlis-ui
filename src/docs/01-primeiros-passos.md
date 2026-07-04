# Primeiros Passos

Neste guia você vai conectar seu primeiro cluster Kubernetes ao Titlis. O processo leva
cerca de 10 minutos e não exige alterações nos seus workloads existentes.

---

## Pré-requisitos

- Acesso a um cluster Kubernetes (qualquer distribuição: EKS, GKE, AKS, k3s, kind...)
- `kubectl` configurado e com acesso ao cluster
- Helm 3.x instalado localmente
- Uma conta na plataforma Titlis (ou acesso de Admin para criar uma)

---

## 1. Criar sua conta

Se sua organização ainda não tem uma conta no Titlis:

1. Acesse a URL da plataforma e clique em **Criar conta**
2. Preencha nome da organização, slug (identificador único, ex: `minha-empresa`) e
   dados do usuário administrador
3. Clique em **Criar conta e entrar**

Você será redirecionado para a tela de **Primeiros Passos** dentro da plataforma.

> Se sua organização já tem conta, peça ao administrador para criar um usuário para você
> em **Configurações → Usuários**.

---

## 2. Gerar a chave de API do operator

O operator precisa de uma chave de API para se autenticar e enviar dados para a plataforma.

1. Na plataforma, acesse **Configurações → Chaves de API**
2. Clique em **Nova chave**
3. Dê um nome descritivo (ex: `cluster-producao`, `cluster-staging`)
4. Copie a chave gerada — ela **não será exibida novamente**

Guarde a chave em local seguro; você vai usá-la no próximo passo.

---

## 3. Instalar o operator via Helm

No terminal, com `kubectl` apontando para o cluster de destino.

**3.1. Criar o namespace e o Secret com a chave de API:**

```bash
kubectl create namespace tear-system

# A chave gerada no passo anterior vai num Secret, sob a chave TEAR_API_KEY
kubectl -n tear-system create secret generic tear-api-keys \
  --from-literal=TEAR_API_KEY=SUA_CHAVE_AQUI
```

**3.2. Instalar o chart (distribuído como OCI, não precisa de `helm repo add`):**

```bash
helm install tear-operator oci://registry-1.docker.io/kailima/tear-operator \
  --version 0.2.0 \
  --namespace tear-system \
  --set kubernetes.clusterName=NOME_DO_CLUSTER \
  --set tearApi.enabled=true \
  --set tearApi.host=SEU_ENDPOINT_TEAR \
  --set tearApi.secretName=tear-api-keys
```

Substitua `SUA_CHAVE_AQUI` pela chave gerada no passo anterior, `NOME_DO_CLUSTER` por um nome
lógico para este cluster e `SEU_ENDPOINT_TEAR` pelo endereço da plataforma fornecido pela sua equipe.

> As credenciais de Datadog **não** são configuradas no operator — o operator as busca na plataforma
> por tenant. Configure-as em **Configurações → Integrações**.

### Verificar se o operator está rodando

```bash
kubectl get pods -n tear-system
# tear-operator-xxxxx   1/1   Running   0   2m
```

Se o pod estiver em `CrashLoopBackOff`, verifique:
- Se a chave de API está correta (sem espaços extras)
- Se o endereço da plataforma está acessível a partir do cluster
- Os logs do pod: `kubectl logs -n tear-system -l app.kubernetes.io/name=tear-operator`

---

## 4. Verificar a conexão na plataforma

De volta à plataforma, na tela de **Primeiros Passos**, aguarde alguns instantes.
A segunda etapa ("Instalar e configurar o operator") vai ficar marcada com ✓ assim que
o operator enviar o primeiro evento.

Isso normalmente acontece em menos de 2 minutos após o pod ficar `Running`.

---

## 5. Aguardar os primeiros scorecards

O operator começa a monitorar todos os Deployments nos namespaces visíveis a ele.
Nos próximos 2–5 minutos, os primeiros workloads aparecem na tela de
**Termômetro de Confiabilidade**.

A terceira etapa ("Aguardando primeiros dados") fica marcada assim que ao menos um
workload for recebido.

Clique em **Ir para o dashboard** para começar a explorar.

---

## Dúvidas comuns

**O operator monitora todos os namespaces?**
Por padrão sim. Você pode excluir namespaces de sistema (ex: `kube-system`, `monitoring`)
na tela **Configurações → Tags** selecionando namespaces e marcando como excluídos.

**Posso ter mais de um cluster conectado?**
Sim. Cada cluster usa sua própria chave de API. Os dados de clusters diferentes aparecem
separados na plataforma, e você pode filtrar por cluster em todas as telas.

**O operator lê segredos ou dados sensíveis do cluster?**
Não. O operator lê apenas metadados de Deployments (spec, labels, annotations) e HPAs.
Ele nunca acessa o conteúdo de Secrets ou ConfigMaps.

---

## Próximos passos

- [Scorecards](/docs/scorecards) — entenda o que o score significa e como melhorá-lo
- [Configurações](/docs/configuracoes) — configure integrações de IA e GitHub para remediações
