# Guia de apresentação — aperIA para a banca avaliadora

**Duração alvo: 4:30** (limite de 5:00, 30s de folga) · **4 apresentadores** ·
**Fluxo demonstrado:** disparar um scan e ler o relatório de vulnerabilidades e ações.

Este documento é um tutorial (Diátaxis): ele conduz quatro pessoas por uma
apresentação específica, do preparo ao fecho. Não é referência do produto — para
os fatos soltos do pipeline, use `../python-api/docs/referencia.md` e
`../python-api/docs/explicacao-pipeline.md`.

---

## Sumário

1. [Preparação — antes de entrar na sala](#1-preparação--antes-de-entrar-na-sala)
2. [Roteiro cronometrado](#2-roteiro-cronometrado)
3. [Perguntas e respostas](#3-perguntas-e-respostas)
4. [Apêndices](#4-apêndices)

---

## 1. Preparação — antes de entrar na sala

Nada nesta seção é falado. É o que precisa estar pronto.

### 1.1 Checklist (fazer 30 minutos antes)

| # | Item | Como conferir |
|---|---|---|
| 0 | Internet funcionando | não é opcional — ver [1.5](#15-a-demo-depende-de-internet) |
| 1 | Stack da API de pé | `docker compose ps` — todos os workers, Postgres, Redis, ZAP e Caldera saudáveis |
| 2 | Front rodando em produção, não `dev` | `npm run build && npm start` — `dev` recompila no meio da demo e trava a tela |
| 3 | `APERIA_API_URL` apontando para a API | sem ela o app cai em modo demonstração e todo dado é sintético |
| 4 | Repositório `vulnshop-demo` monitorado e ativo | `/dash/repositorios` → seção "Repositórios monitorados" |
| 5 | `target_url` do `vulnshop-demo` cadastrado | mesma tela. Sem ele o ZAP é pulado no Tier 3 e o card diz "não executada" |
| 6 | **Uma execução já concluída** do `vulnshop-demo`, com Tier 3 `done` | é a aba do bloco 3. Sem ela a demo não tem relatório para mostrar |
| 7 | Sessão logada nas duas abas | o token de acesso vive 15 minutos; o middleware renova sozinho, mas confira |
| 8 | Zoom do navegador em 100%, notificações do sistema desligadas | — |

### 1.2 As abas, na ordem de uso

Abra as três antes de começar e deixe na ordem. Trocar de aba é `Ctrl+Tab`;
navegar durante a fala custa tempo que não existe.

| Aba | URL | Usada em |
|---|---|---|
| **A** | `/dash` | bloco 1 |
| **B** | `/dash/scans` | bloco 2 (o clique real) |
| **C** | `/dash/relatorios/<id-da-execução-pronta>?de=scans` | blocos 3 e 4 |

Na aba **C**, role até o topo e feche a seção "Execuções deste commit" antes
de começar — ela abre fechada por padrão, mas confira.

### 1.3 Planos B

| Se acontecer | O que fazer | O que dizer |
|---|---|---|
| A API não responde / erro na tela | Trocar a URL para `?preview=1` em qualquer tela | "Estou em modo demonstração agora, com o dataset do protótipo — a estrutura da tela é a mesma." |
| O scan disparado dá 409 | É proteção contra scan duplicado no mesmo commit | "Já tem um scan em andamento neste commit — o pipeline recusa duplicar." Siga direto para a aba C. |
| O Tier 3 do relatório está `degraded` | O Claude não respondeu naquela execução | "Esta execução ficou em modo degradado. O pipeline não derruba por isso: entrega a análise mais pobre em vez de falhar." |
| O card diz "ninguém calculou" no lugar do attack path | Relatório anterior aos campos novos, ou análise degradada | Use outra execução. Não diga "não há caminho de ataque" — é ausência de leitura, não ausência de risco. |
| Estourou 4:30 no bloco 3 | Corte o bloco 4 no ponto marcado `[CORTE]` | — |
| Internet caiu | Não dispare o scan. Narre o bloco 2 e vá para a aba C | "Vou descrever o disparo em vez de executar — sem rede, o Semgrep não busca as regras e o scan concluiria sem ter procurado." |

### 1.4 O que não prometer

Quatro frases que ninguém deve dizer, porque a tela não sustenta:

- ~~"o sistema bloqueia o merge automaticamente"~~ → o Gate 1 cria um status
  check no commit; não existe botão de bloquear merge na interface.
- ~~"faltam 28 minutos para terminar"~~ → o pipeline não persiste estimativa. A
  tela mostra tempo decorrido e o SLA da etapa, de propósito.
- ~~"não há caminho de ataque neste commit"~~ → só se o Tier 3 concluiu e
  devolveu cadeia vazia. Sem análise, a resposta é "ninguém calculou".
- ~~"o aperIA sugere o patch no PR"~~ → o código existe e **não está ligado a
  nada**. Nosso próprio README promete isso; a implementação não cumpre. Ver a
  pergunta correspondente em [3.5](#35-limites-que-assumimos).

### 1.5 A demo depende de internet

Descobrimos isso montando o projeto-alvo: o `--config=auto` do Semgrep falha sem
rede. E não degrada parcialmente: devolve lista vazia, e pela regra
best-effort do pipeline isso não derruba nada, só produz menos findings em
silêncio.

Quatro peças do pipeline precisam de rede externa:

| Peça | Precisa de | Se cair |
|---|---|---|
| Semgrep (os dois tiers) | registro do Semgrep, para buscar as rulesets | lista vazia, sem erro visível |
| Threat Intel | CISA KEV e API do EPSS | sem enriquecimento de CVE |
| Claude | API da Anthropic | análise em modo `degraded` |
| Checkout | GitHub | a task falha, e esta não é best-effort |

Só o TruffleHog e o Trivy rodam offline de verdade, e o Trivy só se o banco de
vulnerabilidades já estiver em cache.

**Consequência prática:** se a internet da sala for duvidosa, não dispare o
scan ao vivo. Use a execução já concluída para os blocos 3 e 4 e narre o
disparo em vez de executá-lo — a fala do bloco 2 funciona igual, e é melhor que
mostrar um pipeline que conclui verde por falta de rede. Que é, aliás, o pior
desfecho possível num produto de segurança, e vocês têm resposta pronta para isso
em [3.4](#34-confiabilidade).

---

## 2. Roteiro cronometrado

**Como ler:** a fala está em citação (`>`) e é literal — foi contada para caber no
tempo. `[ação]` é o que fazer com o mouse. `[CORTE]` marca o único ponto onde o
roteiro pode ser encurtado sem perder o fio.

| Bloco | Tempo | Quem | Tela |
|---|---|---|---|
| 1 · O problema e o que é o aperIA | 0:00 – 0:50 | P1 | aba A |
| 2 · Disparar o scan · os 3 tiers e os 2 portões | 0:50 – 1:55 | P2 | aba B |
| 3 · O relatório: impacto e caminho de ataque | 1:55 – 3:15 | P3 | aba C |
| 4 · Findings, a ação e o fecho | 3:15 – 4:30 | P4 | aba C |

---

### Bloco 1 — P1 · 0:00 a 0:50 · aba A (`/dash`)

> Bom dia. Todo time que usa scanner de segurança conhece o mesmo problema: o
> scanner devolve centenas de alertas, todos parecendo urgentes, e ninguém sabe
> por onde começar. Num scan que rodamos aqui, uma única ferramenta gerou mais de
> oito mil achados — que eram catorze problemas de verdade, repetidos em milhares
> de rotas.
>
> O aperIA não é mais um scanner. Ele orquestra os scanners que já existem —
> TruffleHog, Semgrep, Trivy, OWASP ZAP — e usa inteligência artificial para
> responder à pergunta que nenhum deles responde: destes achados, quais se
> conectam num caminho de ataque real, e o que eu faço primeiro?
>
> O fluxo que vamos mostrar é o principal do produto: disparar um scan e ler o
> relatório.

`[ação]` Nada. Fale sobre a tela de Início parada. Não narre os números dela
— eles não são o assunto e custam tempo.

`[passa para P2]`

---

### Bloco 2 — P2 · 0:50 a 1:55 · aba B (`/dash/scans`)

> Este é o `vulnshop-demo`, um projeto que preparamos com vulnerabilidades
> intencionais. Clico em Iniciar scan, escolho o repositório, confirmo.

`[ação]` Clique em **Iniciar scan** → selecione `vulnshop-demo` → **Confirmar**.
Não espere o resultado.

> O scan entrou. O card já mostra o pipeline: três etapas, e cada uma com as suas
> ferramentas e o estado real de cada uma — não é barra de progresso decorativa,
> é o que a API gravou por ferramenta.
>
> A lógica é barato primeiro, caro só se precisar. O Tier 1 leva até três
> minutos: procura segredo vazado no diff e roda análise estática nos arquivos
> alterados. O Tier 2 abre o escopo para o repositório inteiro — dependências com
> CVE conhecido e análise estática completa.
>
> E entre as etapas existem dois portões determinísticos, sem inteligência
> artificial nenhuma. O primeiro: se um segredo foi verificado como válido, o
> pipeline para ali — não há motivo para gastar mais. O segundo: só escala para o
> Tier 3 se a severidade já for alta ou crítica.
>
> Aqui ela é. Então o Tier 3 roda — e é ele o diferencial do produto.

`[ação]` Aponte o trilho vertical à esquerda do card: os três nós e os dois
losangos entre eles. Os losangos são os portões.

`[passa para P3]`

---

### Bloco 3 — P3 · 1:55 a 3:15 · aba C (relatório pronto)

> O Tier 3 leva de trinta a sessenta minutos, então vou abrir uma execução do
> mesmo projeto que já concluiu.

`[ação]` `Ctrl+Tab` para a aba C. **Já deve estar carregada** — não recarregue.

> Este é o relatório. E a primeira coisa da tela não é técnica: é impacto ao
> negócio. Isso vem do Tier 3, e o nosso prompt proíbe jargão ali — sem CVE, sem
> nome de ferramenta. É a tradução para quem aprova o merge: o que acontece, com
> quais dados, e o que muda se corrigir agora ou postergar.

`[ação]` Deslize o dedo sobre o bloco de impacto. Leia em voz alta a área de severidade mais alta, uma só. Não leia as quatro.

> Abaixo, o caminho de ataque. Não é lista de vulnerabilidades: é uma cadeia por
> rota de ataque, da origem até o destino, com as fases do MITRE ATT&CK em ordem.

`[ação]` Role até o `AttackPathCard`. Aponte o título da cadeia — o `origem →
destino`.

> E o campo mais importante da tela é este: o desfecho de cada passo. Emulado
> significa que o Caldera executou o movimento dentro de um sandbox e ele
> funcionou. Bloqueado significa que executou e um controle conteve — é uma
> defesa que funcionou, e vale tanto quanto um passo que passou. Projeção
> significa que ninguém executou: é inferência do modelo.
>
> A gente separa esses três de propósito. Achatar tudo em validado ou não
> validado transformaria "não tentamos" em "não é possível".

`[ação]` Aponte a legenda no rodapé do card — ela lista apenas os desfechos
presentes naquela execução.

`[passa para P4]`

---

### Bloco 4 — P4 · 3:15 a 4:30 · aba C (continua)

> Descendo: os findings por etapa. Agrupados — cada linha é um problema, com
> quantas ocorrências ele tem.

`[ação]` Role até `FindingsByTier`. **Expanda a banda do Tier 2.**

> Abrindo a etapa, aparecem as ferramentas que rodaram, quantos achados cada uma
> trouxe e quanto tempo levou. E quando uma não rodou, a tela diz o motivo em vez
> de fingir que rodou.
>
> E a ação. O pipeline devolve três campos estruturados: a recomendação —
> bloquear, corrigir ou monitorar —, o esforço estimado e o prazo em dias. Isso
> sai dos dados: a severidade, se o CVE está na lista de exploração ativa da
> CISA, e se o Caldera validou o movimento.

`[ação]` Aponte a recomendação no rodapé do card de attack path.

> `[CORTE]` Uma coisa que vocês vão notar: não existe botão de bloquear merge
> nesta tela. Foi decisão nossa. Não temos a rota para isso ainda, e um botão que
> não faz o que diz é pior que a ausência dele. Quando a rota existir, é ali que
> ele entra.
>
> E duas telas do produto ainda usam dado de demonstração. Elas carregam esse
> aviso na própria interface — está escrito na tela, não escondido.
>
> É isso. Obrigado.

`[ação]` Volte ao topo do relatório (`Home`) — a tela de fecho deve ser o
cabeçalho com o risco, não um rodapé.

**Onde cortar se estourar:** o parágrafo marcado `[CORTE]` sai inteiro, e o
fecho vira *"E duas telas ainda usam dado de demonstração, com aviso na
interface. É isso, obrigado."* Economiza 22 segundos.

---

### 2.1 Contagem de palavras (conferida)

| Bloco | Palavras | A 150 pal/min | A 160 pal/min | Janela |
|---|---|---|---|---|
| 1 | 120 | 48s | 45s | 50s |
| 2 | 170 | 68s | 64s | 65s |
| 3 | 190 | 76s | 71s | 76s |
| 4 | 174 | 70s | 65s | 74s |
| **Total** | **654** | **4:22** | **4:05** | **4:30** |

Cabe com folga. A 150 palavras por minuto — ritmo de fala clara, não
apressado — o roteiro fecha em 4:22, oito segundos abaixo da janela e 38
segundos abaixo do limite de 5:00.

Isso significa que vocês não precisam correr, e não devem: a banca precisa
entender, e inteligibilidade vale mais que conteúdo extra. Os oito segundos de
sobra absorvem uma troca de aba lenta ou uma pausa entre apresentadores.

O parágrafo `[CORTE]` existe para o caso de alguém se estender no bloco 2 ou 3 —
não porque o roteiro esteja apertado. Se no ensaio o total passar de 4:40, corte
ele antes de tentar acelerar.

---

## 3. Perguntas e respostas

Cada entrada tem **resposta curta** (o que dizer) e **reserva técnica** (para
quando insistirem). A reserva traz `arquivo:linha` — não cite o caminho em voz
alta, mas tê-lo evita responder no chute.

### 3.1 Ferramentas

**"O que exatamente vocês pegam do Semgrep?"**

*Curta:* Rodamos o Semgrep duas vezes, com escopos e rulesets diferentes. No
Tier 1, `p/security-audit` só nos arquivos que o commit alterou. No Tier 2,
`--config=auto`, na árvore inteira. De cada achado usamos o `check_id` como
título, a mensagem da regra, o arquivo e a linha, o CWE e — quando a regra
carrega — o CVE. O JSON cru inteiro fica guardado.

*Reserva:* `app/infrastructure/scanners/semgrep_scanner.py`. Tier 1 na linha 65:
`semgrep --config=p/security-audit --json --quiet <alvos>`, timeout 180s. Tier 2
na linha 84: `semgrep --config=auto --json --quiet .`, timeout 300s. Não
declaramos linguagem em lugar nenhum — os dois rulesets são multilíngues por
definição do próprio Semgrep.

O mapa de severidade está na linha 99: `ERROR → high`, `WARNING → medium`,
`INFO → low`. Ou seja, o Semgrep nunca produz `critical` no nosso modelo: o
teto dele é `high`, que já é suficiente para o Gate 2 escalar. Se o campo
`severity` vier ausente, cai em `low`; se vier com valor desconhecido, cai em
`info`. São dois caminhos com resultados diferentes, e isso saiu da forma como o `.get`
está encadeado. Ninguém decidiu que fosse assim.

Um detalhe que vale contar porque foi bug real: o Semgrep devolve
`metadata["cwe"]` como lista de frases descritivas, tipo `["CWE-79: Improper
Neutralization of Input During Web Page Generation..."]`. A coluna do banco é
`VARCHAR(50)`. Um CWE de 93 caracteres derrubou o `INSERT`, a persistência era
best-effort, o erro virou warning — e o pipeline concluiu anunciando sucesso
sobre um repositório onde o Semgrep tinha acabado de achar um XSS. O finding
existia no payload do canvas, alimentou o Tier 2, e nunca foi gravado. Para quem
usava o produto, o repositório estava limpo. Hoje um regex extrai só `CWE-79`, a
frase completa fica no `raw_output`, e falha de gravação derruba a task em
vez de virar aviso.

**"O scan achou tudo que vocês plantaram no repositório de demonstração?"**

*Curta:* Não, e nós medimos a diferença. O `vulnshop-demo` tem 16 vulnerabilidades
de código plantadas, com gabarito no README. O primeiro scan achou 5. As que
faltaram foram SQL injection, XSS, JWT com `alg=none`, path traversal, SSRF e
MD5, que é a cabeça inteira da cadeia de ataque.

*Reserva, porque a causa é interessante:* a falha não estava na aplicação nem no
Semgrep, estava na nossa configuração dele, em dois pontos independentes.

O Tier 1 rodava `p/security-audit`, que é um ruleset estreito. Medido no mesmo
repositório: `p/security-audit` acha 5, `p/default` acha 40, dos quais 21 são
`ERROR` e viram `high`.

O Tier 2 era pior: o `--config=auto` devolvia **zero**, e não por não encontrar
nada. Ele abortava com `InvalidRuleSchemaError`, porque o Semgrep estava pinado
em 1.62.0 (fevereiro de 2024) e o registro de regras passou a servir regras com
severidade `MEDIUM`, que aquela versão não aceita. Uma regra inválida derruba a
configuração inteira. E como o parser só lia o campo `results`, o erro era
invisível: o pipeline registrava a etapa como concluída com 0 findings.

É o mesmo modo de falha do `repo_path` inventado que contamos em
[3.4](#34-confiabilidade): não é falha visível, é afirmação falsa. Por isso o
conserto não foi só atualizar a versão. O scanner agora lê o campo `errors`,
tenta um ruleset de resgate, e se esse também falhar levanta erro, para a
ferramenta aparecer como `falhou` em vez de "concluída, nada encontrado".

**"E o DAST, valeu a pena?"**

*Curta:* Nesse scan, foi o que salvou o resultado. O ZAP reportou SQL Injection e
XSS refletido, os dois como `high`, confirmados por ataque real contra a
aplicação rodando. São exatamente duas das vulnerabilidades que a análise
estática tinha deixado passar.

É o argumento do produto acontecendo por acidente: uma camada falhou e a outra
cobriu. E a diferença entre as duas evidências aparece no relatório, porque os
passos vindos do ZAP entram na cadeia como `emulado` e não como `projecao`.

**"Se o Semgrep já acha o problema, para que serve o resto?"**

*Curta:* O Semgrep responde "este padrão de código costuma ser vulnerável". Ele
não sabe se a dependência tem CVE, se a credencial vazada ainda é válida, se a
rota está exposta na internet, nem se aquele CVE está sendo explorado hoje. Cada
ferramenta responde uma pergunta que as outras não conseguem.

**"O que é 'segredo verificado' no TruffleHog?"**

*Curta:* Verificado é o TruffleHog autenticando de verdade contra o provedor
e confirmando que a credencial funciona. Não é regex de formato. É por isso que
só ele pode disparar o portão que interrompe o pipeline: uma chave AWS que ainda
autentica, vazada num PR, já está exposta agora, e esperar análise não muda
isso.

*Reserva:* Duas nuances. Primeiro, o **modo depende do checkout**: nosso clone é
raso (`--depth 1`), então o modo `git`, que percorre histórico, tem no melhor
caso um commit para olhar — e num scan manual de branch, onde
`base_sha == head_sha`, o intervalo `--since-commit` fica vazio e ele examina
zero commits. O pipeline concluía com zero findings sem ter procurado, o que
é indistinguível de "repositório limpo". Hoje é modo `git` para pull request e
`filesystem` para branch.

Segundo: nós tiramos o `--only-verified`. Ele existia em dobro — na linha de
comando e no parsing — e um segredo detectado mas não validado sumia sem rastro,
o que esconde credencial revogada, de ambiente de teste, ou de provedor para o
qual não existe verificador. A verificação passou a definir a severidade em vez de filtrar o achado:
verificado entra como `critical` com `secret_verified=true`, e não verificado
entra como `medium`.
`medium` é deliberado — não trava merge por suspeita e não infla a análise
profunda. Quem decide o que fazer com um segredo não verificado é quem lê.

**"E o Trivy? E o ZAP?"**

*Curta:* Trivy é SCA no Tier 2: `trivy fs` com `--scanners vuln,misconfig`, ou
seja, CVE conhecido em dependências e misconfiguração de infraestrutura como
código. O `cve_id` que ele encontra é a ponte para o Tier 3 — é ele que a etapa
seguinte usa para consultar se aquele CVE está sendo explorado hoje. O ZAP é DAST
no Tier 3: ataca a URL da aplicação rodando. É a evidência mais forte de
explorabilidade que temos, porque não é inferência sobre código, é requisição
disparada contra o alvo.

*Precisão que vale ter na ponta da língua:* **não escaneamos imagem de
container.** O alvo do Trivy é sempre o diretório do checkout. Nossa própria
documentação diz "dependências, containers e IaC", e a parte de containers não
existe no código — se perguntarem, é `trivy fs`, e o scan de imagem é trabalho
que ainda não fizemos. O `--scanners secret` também fica de fora, de propósito:
é trabalho do TruffleHog, e duplicar produziria dois findings do mesmo segredo,
porque a fonte faz parte da chave de deduplicação.

**"O que é o Caldera e por que ele importa?"**

*Curta:* O Caldera emula as técnicas MITRE ATT&CK que a análise identificou,
dentro de um sandbox isolado, para medir se o ataque funciona de fato naquele
ambiente. É a diferença entre "teoricamente vulnerável" e "comprovado
explorável aqui".

*Reserva:* E ele é honesto sobre o que não conseguiu. O catálogo padrão do
Caldera (Stockpile, ~162 abilities) não cobre toda sub-técnica. Num scan real, as
7 técnicas da cadeia mapearam para zero abilities — o catálogo tinha outras
variantes da mesma família. Existe um fallback para a técnica-pai, mas o que ele
encontra não valida o achado: emular `T1059.001` (PowerShell) quando o achado
é `T1059.007` (JavaScript) é a mesma família, outro ataque. Então isso produz
`caldera_validated: false` + `validacao_parcial: true`, e o relatório diz
explicitamente que o achado não foi validado. Um `success_rate` de 100% com
`caldera_validated: false` não é contradição — é a emulação dizendo "rodei tudo
que consegui, e nada disso era o seu problema".

**"De onde vem a informação de que um CVE está sendo explorado?"**

*Curta:* CISA KEV e EPSS, no Tier 3. O KEV é o catálogo oficial de
vulnerabilidades com exploração comprovada, e diz também se há campanha de
ransomware associada. O EPSS é a probabilidade de exploração. São duas consultas
HTTP, baratas — não pesam no orçamento de tempo do tier.

*Reserva:* Começamos com OpenCTI e ele não subia no ambiente. A troca por
KEV+EPSS resolveu de quebra um bug que estava latente: o componente de CTI do
scorer procurava a chave `active_campaigns` e o cliente antigo só produzia
`active_threat` — então aquele componente caía sempre no valor fixo do `else`,
porque a chave procurada nunca existia.

### 3.2 A decisão — como vocês julgam qual é a ação a ser tomada

De todas as perguntas desta seção, é a que tem mais chance de aparecer. Vale
ensaiar a resposta curta até sair sem tropeço.

**"Como vocês decidem qual ação tomar?"**

*Curta:* Depende de qual decisão. E essa distinção é a parte mais importante do
desenho: **as decisões de fluxo são determinísticas, e a priorização é do LLM.**

Os dois portões não passam por IA em momento nenhum. O primeiro olha um campo
booleano: existe finding com `secret_verified = true`? Se sim, o pipeline para
ali. O campo é binário, então não há estado intermediário para interpretar.

O segundo tem dois critérios, em OU. Um é a severidade máxima num rank fixo —
`critical(4) > high(3) > medium(2) > low(1) > info(0)` — chegando a `high`. O
outro é o nível do risco agregado que o Tier 2 acabou de calcular chegar a
`high`. E o log registra qual dos dois disparou, porque a investigação que se
segue é diferente: severidade aponta para um finding específico, risco agregado
aponta para o conjunto.

A recomendação que aparece no relatório, essa vem do Claude, e é
estruturada: um enum de três valores — `bloquear`, `corrigir`, `monitorar` —,
mais o esforço e o prazo em dias.

*Reserva — por que essa separação:* fluxo de controle decide se roda a próxima
etapa, que é caríssima (ZAP, Caldera, tokens de LLM). Fluxo de controle não
deveria depender de um modelo que pode falhar, alucinar ou variar de resposta
para a mesma entrada. Um portão binário sobre um campo estruturado é auditável e
testável sem mock de rede. Já a priorização é justamente onde ponderar
correlação entre achados vale mais que uma fórmula rígida.

**"Então o prazo de 7 dias é o LLM inventando um número?"**

*Curta:* Não, e o prompt é explícito sobre isso. A regra 10 diz que veredito,
esforço e prazo saem do que está nos dados: severidade dos findings, KEV e
EPSS, validação do Caldera, quantos arquivos e componentes são tocados — e nunca
de suposição sobre o time, a empresa ou o processo de release. E `days` é número
de dias corridos, não data, exatamente para não fingir que sabe o calendário de
ninguém.

*Reserva:* Não é garantia formal — é um prompt, e instrução não é contrato. O que
temos de estrutural é que os três campos são separados e tipados: a
recomendação é enum, o esforço é enum de três níveis, o prazo é inteiro. A UI
colore pela recomendação em vez de procurar a decisão dentro de uma frase. Se o
modelo devolver algo fora do enum, a tela mostra sem cor em vez de adivinhar.

**"E o risk score, de onde sai?"**

*Curta:* Do Claude, numa escala de 0 a 100. O Tier 2 devolve um `risk_score`
raciocinando sobre o conjunto de findings; o Tier 3 devolve um
`risk_score_adjusted` recalculado com a evidência nova. O ajustado tem
precedência.

*Reserva — e aqui vale a honestidade, porque um avaliador atento vai achar isso:*
existe um `RiskScorer` determinístico escrito no domínio, com fórmula ponderada
explícita — CVSS 25%, threat intel 25%, Caldera 30%, negócio 20%, e uma regra
hard de que `secret_verified = true` força o score para no mínimo 90. O
comentário no código chega a chamá-lo de "fonte de verdade". **Ele não é chamado
em lugar nenhum do pipeline atual.** O número que o usuário vê é opinião do
Claude.

Isso não é código morto por descuido: é um trade-off assumido entre
auditabilidade determinística (mais previsível, mais fácil de justificar para
compliance, mais rígido) e capacidade de correlação contextual (enxerga a
relação entre findings de um jeito que soma de pesos não enxerga). Hoje está
resolvido em favor do Claude. O caminho natural é plugar o scorer como piso ou
sanity-check do número do modelo, não como substituto.

### 3.3 A inteligência artificial

**"Qual modelo vocês usam?"**

*Curta:* Claude Sonnet para raciocínio — correlacionar findings no Tier 2 e
montar o caminho de ataque no Tier 3 — e Claude Haiku para formatação, que é
gerar o markdown do comentário no PR. Modelo caro só onde o raciocínio é o
produto.

*Reserva:* `claude-sonnet-4-6` e `claude-haiku-4-5-20251001`, configuráveis por
variável de ambiente. O teto de saída é 16384 tokens nas duas chamadas de
raciocínio e 4096 na de formatação, que é o default do SDK. E o Tier 1 não chama o Claude
nenhuma vez — é regra de desenho, não economia acidental: a etapa que precisa
responder em três minutos não pode depender de uma chamada de rede a um LLM.

**"Como vocês impedem o modelo de inventar vulnerabilidade?"**

*Curta:* Quatro camadas. Primeira, o prompt tem regras invioláveis numeradas: use
apenas dados fornecidos, não invente CVE, TTP, IOC, ator ou valor de risco.
Segunda, quando falta insumo nós injetamos uma sentinela explícita em vez de
string vazia — o modelo recebe "sem dados CTI disponíveis nesta análise" e tem
que devolver `cti_status: "unavailable"`, e é proibido de mencionar campanha,
grupo ou ator. String vazia tem histórico de ser gatilho de alucinação. Terceira,
a saída é JSON com schema estrito, então campo fora do enum a UI não colore.
Quarta, e a mais importante: **o que o modelo diz não decide fluxo**. Se ele
alucinar, o relatório fica errado — o pipeline não passa a rodar nem a pular
etapa por causa disso.

**"E se o Claude falhar ou estiver fora do ar?"**

*Curta:* O cliente devolve um dicionário marcado `degraded: true` em vez de
propagar o erro. O worker não quebra, produz análise mais pobre. E a tela sabe a
diferença entre "não calculado" e "sem risco" — ela nunca mostra zero no lugar de
ausência.

**"Vocês mandam código-fonte para a Anthropic? E segredo vazado?"**

*Curta:* Não mandamos a árvore do repositório — o prompt recebe a lista de
findings (severidade, ferramenta, título, arquivo, linha, CVE), não o código.
E segredo passa por redação antes de sair.

*Reserva:* Isso veio de um incidente instrutivo. Nosso guard de prompt injection
bloqueia padrões suspeitos, e um deles é `BEGIN ... PRIVATE KEY` — que é
**exatamente aquilo que um scanner de secrets deve encontrar**. Com um
repositório que tem chave privada de verdade (o OWASP Juice Shop tem), a cadeia
era: TruffleHog acha a chave → o valor vai para a descrição do finding → o prompt
do relatório inclui os findings completos → o guard casa o padrão → erro → Tier 2
em modo degradado, sem IA. O incentivo estava invertido: **quanto melhor o
scanner trabalhava, menos análise por IA o usuário recebia.**

A correção foi redigir, não bloquear. `redigir_segredos()` troca o material
sensível por um marcador antes do guard, e fica em `ClaudeClient.call`, que é
o ponto por onde toda chamada passa — corrigir no builder de prompt consertaria
um caminho e deixaria os outros. Resolve os dois lados: o segredo não sai da
nossa infraestrutura, e o texto que sobra não dispara o padrão. O modelo não
precisa do segredo para raciocinar sobre ele; precisa saber que existe, de que
tipo e onde. O valor original continua no banco, para o usuário.

### 3.4 Confiabilidade

**"Como vocês lidam com falso positivo?"**

*Curta:* Não filtramos por conta própria — mostramos a evidência e deixamos quem
lê decidir. O que fazemos é não achatar graus de certeza. Segredo verificado é
`critical`, não verificado é `medium`. Passo emulado pelo Caldera é `emulado`,
inferência do modelo é `projecao`, e a tela mostra os dois com rótulos
diferentes. A frase honesta do card é "1 de 3 emulados · restante teórico".

**"E falso negativo? O scan pode não achar algo?"**

*Curta:* Pode, e nós escolhemos esse lado do trade-off conscientemente. A regra
central do pipeline é nunca derrubar a análise inteira por causa de uma
dependência instável: se um scanner não está instalado ou estoura timeout, ele
devolve lista vazia e os outros continuam. Preferimos um falso-negativo — aquele
scanner específico não revelou aquele achado — a um falso-positivo de
indisponibilidade, que é o PR travar porque o Trivy não respondeu, não porque o
código tem problema.

*Reserva — mas essa regra tem duas exceções, e o critério é o mesmo:*

| Falha | Best-effort? | Por quê |
|---|---|---|
| Scanner quebrou | sim → `[]` | os outros scanners ainda produzem resultado |
| **Checkout falhou** | **não** → task falha | sem árvore em disco não há o que escanear |
| **Gravação falhou** | **não** → task falha | o produto perde o que foi encontrado |

O critério não é a gravidade do erro, é se ainda existe trabalho útil depois
dele. Checkout e persistência que falham deixam o pipeline concluir dizendo
"nada encontrado" — que num produto de segurança é o pior desfecho possível,
porque é indistinguível do resultado legítimo.

E não é hipotético. Por um bom tempo o pipeline rodava inteiro sem nunca ter
visto o código: o `repo_path` que atravessava o canvas era um caminho inventado
que não existia em lugar nenhum. Os scanners falhavam com "No such file or
directory", devolviam lista vazia pela regra best-effort, e a cascata era pior
que "faltam alguns findings" — Tier 1 entregava zero, o Gate 1 não tinha secret
para bloquear, o Tier 2 correlacionava nada, o risco fechava em `info` e o Gate 2
nunca escalava. **O pipeline terminava verde, com relatório dizendo que estava
tudo bem.**

**"Um scan pode ficar preso para sempre?"**

*Curta:* Já ficou, e tem conserto em duas camadas. Um `ScanJob` está travado
quando diz estar em andamento e não dá sinal de vida há mais de 30 minutos. Isso
é varrido no boot da API — se o processo está subindo, a stack reiniciou e o que
estava em voo se perdeu — e também de forma preguiçosa, na hora de um novo
disparo, antes de recusar com 409.

*Reserva:* A causa raiz era uma assimetria de durabilidade: o Postgres tinha
volume, o Redis subia com `appendonly no`, fila inteira em memória. Bastava um
`docker compose down` entre o disparo e o consumo para as tarefas evaporarem — e
a linha no Postgres sobrevivia, órfã, dizendo `running`. Pior: `commit_sha` é
UNIQUE, então todo redisparo daquele commit caía na mesma linha órfã, que
continuava dizendo `running`. O commit virava permanentemente não-escaneável.
Uma proteção contra concorrência tinha virado prisão perpétua. Hoje o Redis tem
volume e `appendonly yes`, e a recuperação marca os tiers pendentes como
`failed`. Isso é uma afirmação honesta, "ninguém vai terminar isto", e não uma
tentativa de salvar o trabalho perdido.

### 3.5 Limites que assumimos

Estas são as perguntas em que a resposta honesta é "não fizemos". Ter cada uma
pronta é melhor que improvisar na hora.

**"Tudo que vocês mostraram é dado real?"**

*Curta:* Não, e a interface diz onde. Início, Findings, Relatórios e Scans leem a
API. Remediações, AI Emulation e Time ainda são dado de demonstração, e carregam
um badge na própria tela sempre que a conexão é real. Duas delas não têm rota na
API ainda; AI Emulation tem fonte disponível e é a próxima.

**"Por que os findings do ZAP não aparecem individualmente?"**

*Curta:* Aparecem, mas a visão padrão é a agrupada, e por um motivo de escala. Com
DAST ligado, um scan escreveu 8.474 findings — três ordens de grandeza acima das
outras fontes, que trouxeram 50 e 7. Eram catorze problemas de verdade repetidos
por rota: 3.007 ocorrências de "Cross-Domain Misconfiguration", uma por URL. A
lista plana ficava permanentemente truncada e o ZAP afogava TruffleHog e Semgrep
na ordenação. A visão agrupada não tem teto nenhum e cabe numa tela.

**"Vocês validam que o alvo do DAST é seu?"**

*Curta:* Bloqueamos alvo interno — localhost, faixas privadas, endpoint de
metadata de cloud — com 422 e mensagem pronta, porque um DAST dispara requisições
ativas e um alvo interno transformaria o produto em SSRF contra a própria
infraestrutura. O que não temos é prova de propriedade de alvo externo. Hoje
é responsabilidade de quem cadastra. Para ser multiusuário de verdade, vai
precisar de arquivo em `/.well-known`, registro DNS ou equivalente. E DNS
rebinding não é pego — resolver DNS no cadastro é TOCTOU; a defesa certa é
política de egresso no container do ZAP.

**"O README diz que vocês entregam patches como code suggestions no PR. Cadê?"**

*Curta:* Não entregamos. O caso de uso existe no código, com prompt e testes, e
não está ligado a nada — nenhuma rota HTTP e nenhuma task do pipeline o
invoca. É uma promessa do README que a implementação ainda não cumpre, e a gente
prefere dizer isso do que demonstrar uma tela que não existe.

*Se insistirem em por que:* a sugestão de patch é o passo em que o produto passa
de "diagnosticar" para "escrever código no repositório de outra pessoa". Ligar
isso exige decidir o gate de aprovação humana antes, não depois. O que está
pronto é a parte que raciocina; o que falta é a parte que age — e ela é a que
precisa de mais cuidado.

**"O Caldera realmente valida os ataques?"**

*Curta:* Às vezes, e a gente mede quantas. No último scan real, das 7 técnicas
que a análise identificou, 6 não têm cobertura nenhuma no catálogo padrão do
Caldera. Uma rendeu validação parcial.

*Reserva, e o motivo é estrutural:* o Stockpile é catálogo de
pós-exploração de host e Active Directory, e nosso alvo é aplicação web. `T1185`
(Browser Session Hijacking) e `T1598.003` (phishing) não são executáveis como
ability em agente nenhum. Além disso o catálogo é dominado por Windows — 167
executores Windows contra 71 Linux — e nosso sandbox é Linux.

Isso deixa uma decisão de produto aberta, e ela é honesta de expor: o Caldera é o
motor de emulação para web, ou a validação web é papel do ZAP e da verificação de
segredo, ficando o Caldera para host e infraestrutura? Ainda não decidimos. O que
a tela não faz é esconder a diferença: um passo não emulado aparece como
`projecao`, não como validado.

**"Duas execuções do mesmo commit mostram os mesmos findings?"**

*Curta:* Sim, e para código isso é quase sempre certo — mesmo commit, mesmo
código. Para DAST é falso, e nós sabemos: o ZAP roda contra a aplicação
implantada, e duas execuções podem legitimamente achar coisas diferentes. Os
findings são chaveados por commit, não por execução. O que difere entre execuções
é o desfecho por ferramenta, o risco e o status das etapas.

*Reserva:* Escopar por execução é decisão de custo, não de dificuldade — são
cerca de 1.800 findings de ZAP por scan, multiplicados pelo número de execuções.
E há uma janela conhecida relacionada: o canvas do Celery carrega só o
`commit_sha`, não o id da execução, então um redisparo entre o último tier
encerrar e uma task atrasada escrever faz a escrita cair na execução nova.
Fechar isso é mecânico, mas mexe em umas dez assinaturas de task e no canvas, que
é a parte mais frágil do sistema.

**"Por que o relatório não mostra quanto falta para terminar?"**

*Curta:* Porque o pipeline não persiste estimativa nenhuma, e "faltam 28 minutos"
seria número inventado. O que a tela pode dizer com honestidade é quanto já
passou e qual o SLA da etapa, que é característica do produto. Foi escolha
deliberada.

**"O DAST cobre a aplicação inteira?"**

*Curta:* Não, e é escolha explícita: cobertura parcial em tempo previsível, em
vez de cobertura total em tempo indeterminado. Contra o Juice Shop, um active
scan sem teto não termina em tempo de pipeline. Colocamos os tetos dentro do
ZAP — 3 minutos de crawl, 10 de active scan, 2 por regra — para ele encerrar
sozinho e entregar o que achou. Se o cliente desistisse por timeout, os alertas
que o ZAP já tinha encontrado iriam embora junto; trocar 10 minutos por 40 só
adia o mesmo zero. Um DAST que devolve as vulnerabilidades das primeiras dez
rotas é mais útil que um que devolve lista vazia.

### 3.6 Arquitetura

**"Por que três tiers em vez de rodar tudo?"**

*Curta:* Custo e latência. TruffleHog e Semgrep no diff terminam em segundos;
Trivy e Semgrep no repo inteiro levam minutos; ZAP e Caldera levam de 30 a 60.
Se todo PR disparasse os três, todo PR pagaria o custo mesmo quando o problema já
estava resolvido nos primeiros segundos — o caso do PR que só tem um segredo
vazado e nada mais.

**"Por que uma fila do Celery por tier?"**

*Curta:* Para cada uma escalar independente. O Tier 1 roda com concorrência alta,
é leve e o PR quer resposta em minutos; o Tier 3 roda com concorrência baixa. Com
fila única, um PR pesado enfileirado atrás de uma rajada de PRs triviais
atrasaria justamente o feedback rápido que o Tier 1 promete. E isola falha: um
worker de Tier 3 caído não impede os outros dois de responderem.

**"Por que cada tarefa clona o repositório de novo?"**

*Curta:* Porque os workers rodam em containers diferentes, sem filesystem comum
— um clone feito no Tier 1 simplesmente não existe no Tier 2. A alternativa
óbvia, volume compartilhado, resolve o acesso e cria um problema pior: quem
apaga, e quando. O pipeline é assíncrono, tem portões que o interrompem no meio e
tasks que podem reexecutar; nenhum ponto sabe com segurança que ninguém mais vai
precisar daquela árvore. Apagar cedo quebra um tier que ainda ia rodar, apagar
tarde enche o disco com uma cópia do código de cada commit já escaneado. Com
clone por tarefa a pergunta desaparece: quem clonou apaga, no `finally`. E o
fetch é raso do commit exato, então o custo é o tamanho da árvore, não do
histórico.

**"O token do GitHub fica exposto no clone?"**

*Curta:* Não, e as duas formas usuais são ruins. Embutir na URL do remote grava a
credencial em texto puro no `.git/config` **dentro do diretório clonado**, onde
qualquer scanner que varre a árvore pode achar — e o TruffleHog, ironicamente, é
excelente nisso. Passar por `-c` deixa o token em `argv`, legível em
`/proc/<pid>/cmdline` por qualquer processo da máquina. Usamos variáveis de
ambiente `GIT_CONFIG_*`, que o git aplica como se fossem `-c`, sem persistir nada
e sem aparecer em `argv`. Não é perfeito — autenticar exige o segredo em algum
canal do processo filho; a escolha é sobre qual canal tem menor superfície. E
tudo que sai do módulo passa por redação, porque o git ecoa a URL em mensagem de
erro.

**"Quanto custa um scan?"**

*Curta:* O Tier 1 não chama o Claude nenhuma vez, por desenho. O Tier 2 é uma
chamada ao Sonnet mais uma ao Haiku. O Tier 3, quando escala, é outra de cada.
Então o custo de LLM por scan é de zero a quatro chamadas: zero quando o
Gate 1 bloqueia — um segredo válido vazado não precisa de análise nenhuma —, duas
quando o Gate 2 não escala, quatro no caminho completo. O custo dominante nem é
token: é tempo de ZAP e Caldera.

---

## 4. Apêndices

### 4.1 Números para citar de cor

Confirme cada um na execução que vocês vão usar. Os de referência abaixo são de
scans reais registrados na documentação da API:

| Número | O que é |
|---|---|
| 3 tiers, 2 portões | a forma do pipeline |
| ≤3min · ≤10min · 30–60min | SLA de cada tier |
| 0 a 100 | escala do risk score |
| `critical > high > medium > low > info` | o rank do Gate 2; escala em `high` |
| 8.474 findings → 14 grupos | por que a visão agrupada é o padrão |
| 3.007 ocorrências | do mesmo problema ("Cross-Domain Misconfiguration"), uma por URL |
| 369 alertas do ZAP → 8 findings | o dedup colapsando rotas, antes do conserto |
| 66 → 62 alertas, 300s → 135s | o custo da regra de DOM XSS, que sobe Firefox headless |
| 0 a 4 chamadas de LLM | por scan: 0 se o Gate 1 bloqueia, 2 se o Gate 2 não escala, 4 no caminho completo |

### 4.2 Glossário — oito termos que vão aparecer

| Termo | Uma linha |
|---|---|
| **SAST** | análise estática: lê o código sem executar (Semgrep) |
| **SCA** | análise de dependências: procura CVE conhecido nos pacotes (Trivy) |
| **DAST** | análise dinâmica: ataca a aplicação rodando (ZAP) |
| **CWE** | catálogo de *tipos* de fraqueza (CWE-89 é SQL injection) |
| **CVE** | identificador de uma vulnerabilidade *específica* num software específico |
| **CISA KEV** | catálogo oficial de CVEs com exploração comprovada em campo |
| **EPSS** | probabilidade de um CVE ser explorado |
| **MITRE ATT&CK** | taxonomia de táticas (`TAxxxx`) e técnicas (`Txxxx`) de atacantes reais |

### 4.3 Onde a nossa própria documentação está desatualizada

Se um avaliador leu o `README.md` ou os docs da API antes da banca, ele pode
citar coisa que o código não faz mais. Estas são as divergências reais — **o
código é a verdade**, e admitir a defasagem é melhor que defender o texto.

| A doc diz | O código diz |
|---|---|
| TruffleHog usa `--only-verified` | A flag foi removida. Não verificado entra como `medium` em vez de desaparecer. (A §9 do próprio documento já corrige; as §3 e §4 ficaram atrás.) |
| Gate 2 escala por severidade máxima | São dois critérios em OU — severidade individual ou risco agregado |
| Tier 3 usa OpenCTI | É **CISA KEV + EPSS**. O cliente do OpenCTI ficou no repo e não é instanciado |
| Trivy varre "dependências, containers e IaC" | Só `trivy fs`. **Não há scan de imagem de container** em ponto nenhum |
| "Entrega patches como GitHub code suggestions" | O caso de uso não é invocado por rota nem por task |
| "27 rotas HTTP" | 30 |
| `/findings/groups` agrupa por 5 campos | 7 — inclui `cve_id` e `cwe_id`. Sem o CWE, grupos distintos colidiam |

Se perguntarem por que a doc está atrás: o pipeline mudou mais rápido que o
texto, e as correções foram registradas em seções novas em vez de reescrever as
antigas. É dívida real, e é o tipo de dívida que produz exatamente este
constrangimento.

### 4.4 Se sobrar tempo (30s de folga)

Na ordem de valor, se a banca não perguntar nada e houver espaço:

1. Expandir a banda do Tier 1 no card de findings e mostrar uma ferramenta
   **pulada com o motivo escrito** — é a prova concreta de que a tela não finge.
2. Abrir "Execuções deste commit" e mostrar que rescanear empilha execução em vez
   de sobrescrever.
3. Clicar em "ver todas as N ocorrências" de um grupo, para mostrar o drill-down
   com recorte no servidor.

Se a banca não perguntar nada, encerrar meio minuto antes é um resultado melhor
que preencher o tempo.
