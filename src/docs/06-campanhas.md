# Campanhas

Campanhas permitem aplicar a mesma correção em dezenas de workloads ao mesmo tempo,
com promoção controlada entre ambientes (dev → hml → prd). Isso elimina o trabalho
de abrir e revisar um PR por workload quando o problema é sistemático.

---

## Quando usar Campanhas

Use campanhas quando:
- Vários workloads têm o mesmo tipo de problema (ex: todos sem HPA configurado)
- Você quer otimizar HPA de uma frota inteira de serviços
- Quer aplicar um padrão de configuração de forma consistente em vários times

Para correções pontuais em um único workload, use o [ARIA](/docs/assistente-ia) diretamente.

---

## Como criar uma campanha

### A partir de Recomendações de HPA

1. Acesse a tela **Remediação**
2. Filtre e selecione os workloads que deseja incluir
3. Clique em **Criar campanha**
4. Revise o resumo (quantos workloads, tipos de mudança) e confirme

### A partir de findings de scorecard (via ARIA)

Você pode pedir ao ARIA para criar uma campanha baseada em findings:

> *"Crie uma campanha para adicionar liveness probe em todos os workloads do namespace payments"*

O ARIA lista os workloads afetados, exibe um resumo da mudança e aguarda sua confirmação
antes de iniciar.

---

## Fluxo de promoção: dev → hml → prd

Cada workload em uma campanha passa por três estágios de promoção:

```
dev
 └── PR criado → aguardando merge
     └── (merge detectado)
         └── hml
             └── PR criado → aguardando merge
                 └── (merge detectado)
                     └── prd
                         └── PR criado → AGUARDANDO APROVAÇÃO HUMANA
                                          (nunca automático)
```

### Regra de prd: aprovação obrigatória

**Produção nunca é promovido automaticamente.** Independentemente de qualquer configuração,
o PR de `prd` só é criado após aprovação manual na plataforma.

Quando os PRs de `dev` e `hml` são mergeados, a campanha para em
**"Aguardando aprovação para produção"**. Um Admin ou Engineer com permissão precisa
clicar em **Promover para prd** na tela da campanha.

---

## Acompanhando o status de uma campanha

A tela **Remediação → Campanhas** exibe todas as campanhas com seu estado geral e o
progresso de cada workload.

### Estados de um item de campanha

| Estado | Significado |
|---|---|
| **Pendente** | Ainda não iniciado |
| **PR aberto** | PR foi criado, aguardando merge |
| **Aguardando promoção** | Ambiente anterior mergeado, aguardando aprovação para o próximo |
| **Aguardando aprovação** | Aguardando aprovação humana para prd |
| **Concluído** | PR de prd mergeado ou campanha finalizada para este workload |
| **Falhou** | Erro ao criar PR (ex: conflito de branch, repositório sem acesso) |
| **Pulado** | Workload excluído da campanha (ex: já estava corrigido) |

### O que fazer se um PR for fechado sem merge

Se alguém fechar o PR sem fazer merge, o item da campanha fica em estado **Falhou**.
Você pode reabrir o item manualmente na plataforma, o que cria um novo PR.

---

## Política de never-reduce

Assim como no ARIA, campanhas nunca geram PRs que reduzam recursos:
- `minReplicas` nunca diminui
- `maxReplicas` nunca diminui
- CPU requests e limits nunca diminuem
- Memory requests e limits nunca diminuem

Se a mudança calculada para um workload violaria essa regra, o workload é marcado
como **Pulado** com o motivo explicado.

---

## Permissões necessárias

- **Criar campanha:** Engineer ou Admin
- **Aprovar promoção para prd:** Admin
- **Cancelar campanha:** Admin

---

## Dúvidas comuns

**Posso cancelar uma campanha em andamento?**
Sim. Cancelar uma campanha não reverte PRs já criados — apenas para a criação de novos.
PRs abertos continuam existindo no repositório e você decide o que fazer com eles.

**Uma campanha pode incluir workloads de clusters diferentes?**
Sim. A campanha agrupa workloads por repositório, não por cluster. O PR é criado uma
única vez por repositório, mesmo que o mesmo repositório sirva workloads de clusters diferentes.

**Quanto tempo leva uma campanha?**
Depende da velocidade do seu processo de revisão de PRs. O Titlis detecta merges em
tempo real via webhook do GitHub e avança automaticamente para o próximo ambiente.

**Posso excluir um workload específico de uma campanha em andamento?**
Sim. Na tela de detalhe da campanha, clique em **Excluir** ao lado do workload. Isso
cancela os PRs pendentes desse workload sem afetar os demais.
