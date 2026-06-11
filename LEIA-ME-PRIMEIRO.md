# GUIA PASSO A PASSO — Chatbot RAG sobre a Ditadura Civil-Militar
### Para quem nunca programou, usando Debian 13

Este guia assume **zero conhecimento de programação**. Siga na ordem.
Tempo estimado da Etapa 0 à Etapa 3: uma tarde. O resto é feito junto com o Claude Code.

---

## ETAPA 0 — Entenda o que você vai construir (10 min de leitura)

**RAG (Retrieval-Augmented Generation)** = "Geração Aumentada por Recuperação".
Em vez de a IA "inventar" respostas da memória dela, o sistema funciona assim:

1. Você alimenta um **banco de dados** com documentos confiáveis (relatórios da CNV, Brasil: Nunca Mais, arquivos da CIA, teses...).
2. Cada documento é cortado em pedaços ("**chunks**") e transformado em números que representam seu significado ("**embeddings**").
3. Quando o usuário pergunta algo, o sistema **busca os trechos mais parecidos** com a pergunta no banco.
4. A IA escreve a resposta **usando apenas esses trechos**, citando autor, documento e página.

Por isso o RAG é a arquitetura certa para o seu projeto: ele permite **transparência editorial e referência autoral por construção** — toda resposta nasce amarrada a uma fonte.

**A pilha de ferramentas (tudo gratuito ou com camada gratuita):**

| Função | Ferramenta | Custo | Software livre? |
|---|---|---|---|
| Banco de dados + busca vetorial | Supabase (Postgres + pgvector) | Grátis (free tier) | Sim (Postgres e pgvector são FOSS; o serviço hospedado é da empresa Supabase, mas pode ser auto-hospedado depois) |
| Site/chatbot | Next.js hospedado na Vercel | Grátis (hobby tier) | Next.js é código aberto |
| Mapa do Brasil | Leaflet + OpenStreetMap | Grátis | Sim, 100% livre |
| Embeddings (transformar texto em vetores) | modelo `multilingual-e5-small` rodando no SEU computador | Grátis | Sim (pesos abertos) |
| IA que escreve as respostas | Groq ou OpenRouter servindo modelos abertos (Llama, Qwen) — camada gratuita | Grátis para protótipo | Modelos de pesos abertos |
| OCR de documentos escaneados | Tesseract | Grátis | Sim |
| Automação do desenvolvimento | Claude Code | Incluído no seu plano Claude | Não (mas o código que ele gera é seu) |

**Custo total para o protótipo do mestrado: R$ 0**, além do plano Claude que você já tem.

---

## ETAPA 1 — Preparar o Debian 13 (30–40 min)

Abra o **Terminal** (no GNOME: tecla Super, digite "terminal"). Copie e cole um comando por vez e aperte Enter. Quando pedir senha, é a senha do seu usuário (ela não aparece ao digitar — é normal).

### 1.1 Atualizar o sistema e instalar o básico
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3 python3-pip python3-venv tesseract-ocr tesseract-ocr-por poppler-utils
```
O que isso instala:
- `git` — controle de versão (guarda o histórico do seu código e conecta ao GitHub)
- `python3` + `pip` — linguagem usada no pipeline de ingestão de documentos
- `tesseract-ocr-por` — OCR em português para documentos escaneados (jornais da época, CNV)
- `poppler-utils` — extrai texto e imagens de PDFs

### 1.2 Instalar o Node.js (necessário para Claude Code e Next.js)
O Debian 13 traz Node antigo nos repositórios. Use o instalador oficial via `nvm` (gerenciador de versões do Node):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
**Feche e abra o terminal de novo**, depois:
```bash
nvm install --lts
node --version
```
Deve aparecer algo como `v22.x.x`.

### 1.3 Instalar o Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```
Para confirmar a forma de instalação mais atual e os requisitos, consulte a documentação oficial:
**https://docs.claude.com/en/docs/claude-code/overview**

Primeiro uso:
```bash
mkdir -p ~/projetos/memoria-e-verdade
cd ~/projetos/memoria-e-verdade
claude
```
Na primeira vez ele abre o navegador para você fazer login com sua conta Claude. Pronto: você conversa com ele em português, dentro do terminal, e ele cria e edita arquivos do projeto para você.

### 1.4 Copiar este kit para dentro do projeto
Descompacte o arquivo `kit-memoria-e-verdade.zip` que acompanha este guia e copie TODO o conteúdo para `~/projetos/memoria-e-verdade/`. A estrutura deve ficar:
```
memoria-e-verdade/
├── CLAUDE.md                  ← a "constituição" do projeto (o Claude Code lê sempre)
├── LEIA-ME-PRIMEIRO.md        ← este guia
├── .claude/
│   └── agents/                ← sua equipe de agentes
│       ├── curador-historiador.md
│       ├── engenheiro-de-dados.md
│       ├── cientista-de-dados.md
│       ├── arquiteto-backend.md
│       └── designer-frontend.md
└── docs/
    ├── fluxo-de-trabalho.md   ← as fases do projeto e a economia de tokens
    ├── contrato-api.md        ← o contrato entre frontend e backend
    └── fontes-prioritarias.md ← onde baixar os documentos históricos
```
Dica: pastas que começam com ponto (`.claude`) ficam ocultas. No gerenciador de arquivos, aperte `Ctrl+H` para vê-las.

---

## ETAPA 2 — Criar as contas gratuitas (30 min)

Crie nesta ordem, todas com o mesmo e-mail:

1. **GitHub** — https://github.com — onde seu código fica guardado e público (princípio 4: código aberto). Crie um repositório chamado `memoria-e-verdade`, marque como **Public** e escolha uma licença livre (sugestão: **AGPL-3.0**, que obriga quem usar seu código em serviços online a também abrir o código — coerente com seus princípios).
2. **Supabase** — https://supabase.com — entre com a conta do GitHub. Crie um projeto (região São Paulo, `sa-east-1`). **Anote a senha do banco.** O plano Free dá 500 MB de banco — suficiente para dezenas de milhares de chunks de texto.
3. **Vercel** — https://vercel.com — entre com a conta do GitHub. Não precisa configurar nada agora; quando o site existir, a Vercel publica automaticamente a cada atualização no GitHub.
4. **Groq** — https://console.groq.com — camada gratuita generosa para modelos abertos (Llama). Gere uma **API key** e guarde.
   - Alternativa: **OpenRouter** (https://openrouter.ai) tem modelos com sufixo `:free`.
   - Opção 100% livre e local (se seu computador tiver 8 GB+ de RAM): **Ollama** (https://ollama.com) roda modelos abertos na sua máquina, sem internet e sem limite — mais lento, mas soberano.

**Segurança, regra de ouro:** chaves de API são senhas. Elas ficam só no arquivo `.env.local` (que o Claude Code vai criar) e **nunca** vão para o GitHub. O `CLAUDE.md` do kit já instrui os agentes sobre isso.

---

## ETAPA 3 — Aprender o mínimo necessário (paralelo às outras etapas)

Você NÃO precisa virar programador. Precisa entender o suficiente para revisar e decidir. Materiais gratuitos e em português quando possível:

**Conceitos de RAG e IA (prioridade máxima para a dissertação):**
- "What is RAG?" — IBM Technology (YouTube, legendas em PT): busque "What is Retrieval-Augmented Generation IBM"
- Documentação de IA do Supabase (inglês, mas o Claude traduz qualquer trecho para você): https://supabase.com/docs/guides/ai
- Curso gratuito de NLP da Hugging Face: https://huggingface.co/learn

**Terminal Linux e Git (prioridade alta):**
- Curso em Vídeo — "Git e GitHub" (Gustavo Guanabara, YouTube, PT-BR, gratuito)
- Debian Handbook (referência, PT disponível): https://debian-handbook.info

**Python básico (prioridade média — o Claude escreve o código, você só lê):**
- Curso em Vídeo — "Python 3 — Mundo 1" (YouTube, PT-BR)

**Mapas:**
- Leaflet, tutorial oficial: https://leafletjs.com/examples/quick-start/

**Dica metodológica:** use o próprio Claude (aqui no app) como tutor. Cole um trecho de código que o Claude Code gerou e peça "explique linha por linha como se eu nunca tivesse programado". Isso vira, inclusive, material reflexivo para o memorial da dissertação.

---

## ETAPA 4 — Trabalhar com a equipe de agentes

Leia `docs/fluxo-de-trabalho.md`. Em resumo: você abre o Claude Code na pasta do projeto e conduz **uma fase por vez**, convocando os agentes pelo nome:

```
> Use o agente curador-historiador para revisar a taxonomia de metadados em docs/taxonomia.md
```

O Claude Code também convoca os agentes sozinho quando a tarefa bate com a descrição deles. Você é o **Líder Geral** de todas as equipes — os "líderes" das suas três equipes foram fundidos na sessão principal do Claude Code (conduzida por você) exatamente para economizar tokens.

---

## ETAPA 5 — Ordem de construção recomendada

1. **Fase 0 — Fundação**: repositório no GitHub, projeto Next.js vazio publicado na Vercel ("Olá, mundo"). Vitória rápida para você ver o ciclo completo funcionando.
2. **Fase 1 — Acervo piloto**: ingestão de UM documento só (sugestão: Relatório da CNV, Volume I) até a busca vetorial funcionar. Só depois escalar para o resto do acervo.
3. **Fase 2 — Chat com citações**: o coração do produto.
4. **Fase 3 — Feedback do usuário**: resposta alternativa + classificação (princípio 2, colaboração).
5. **Fase 4 — Biografias e mapa**: seção de nomes, minibiografias e o mapa Leaflet.
6. **Fase 5 — Módulo "crimes e justiça"**: a comparação com o direito atual (leia o alerta em `docs/contrato-api.md` — este módulo exige curadoria humana redobrada).

Boa construção. Memória, verdade e justiça.
