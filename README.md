# 🤖 My Agent Engineer Journey · 2026 Roadmap

> **26 weeks · 9 phases · 62 modules · 3 capstones**  
> Tracking my progress through the [Agent Engineer 2026 Roadmap](https://ch-balaji.github.io/ai-engineer-roadmap/)

---

## 📊 Progress Overview

| Phase | Topic | Weeks | Modules | Status |
|-------|-------|-------|---------|--------|
| 01 | Python + Async Engineering | 1–3 | 8 | ⬜ Not started |
| 02 | LLM Mental Model | 4 | 5 | ⬜ Not started |
| 03 | Prompt Engineering | 5–7 | 7 | ⬜ Not started |
| 04 | RAG + Evaluation | 8–12 | 9 | ⬜ Not started |
| 05 | Tools, MCP & Single Agents | 13–16 | 8 | ⬜ Not started |
| 06 | Memory + Context Engineering | 17–19 | 7 | ⬜ Not started |
| 07 | Multi-Agent Orchestration | 20–22 | 8 | ⬜ Not started |
| 08 | Guardrails + LLMOps | 23–24 | 4 | ⬜ Not started |
| 09 | Cloud + Deployment | 25–26 | 6 | ⬜ Not started |

---
# Section 1: Introduction
<!-- section: // Introduction -->
** Introduction and Things to Begin with goes here**
## Intro and To Begin with
- [ ] Understanding the Roadmap
- [ ] Understanding the Course Plan
- [ ] AI Agent for Jobs
- [ ] How LLMs are Built
- [ ] Why your AI Agents are Costly in Production
- [ ] Claude Code Setup
### Intro to Python
- [ ] Why Python?
- [ ] Intro to Google Colab and Hands-on


---
<!-- section: // Learning Phrases -->
## Phase 01 — Python + Async Engineering
**Weeks 1–3 · 8 modules · Difficulty: 2/5**

> Every agent framework runs on Python. Skip this and everything later breaks in mysterious ways.

### Module 1.1 — Core Python
- [ ] Variables, types, control flow
- [ ] Functions, `*args`/`**kwargs`
- [ ] List & dict comprehensions
- [ ] decorators
- [ ] Generator expressions
- [ ] Type hints (needed for Pydantic later)

### Module 1.2 — Object-Oriented Python
- [ ] Classes, inheritance, dunder methods
- [ ] Abstract base classes
- [ ] Dataclasses & Pydantic models

### Module 1.3 — Data Structures
- [ ] Lists, dicts, sets, tuples
- [ ] Stacks, queues, heaps
- [ ] When to use what

### Module 1.4 — Error & File Handling
- [ ] try/except/finally patterns
- [ ] Custom exceptions
- [ ] Reading/writing files and JSON

### Module 1.5 — Working with HTTP APIs
- [ ] `requests` and `httpx`
- [ ] Auth patterns (Bearer, API keys)
- [ ] Parsing JSON responses

### Module 1.6 — Database Connectivity
- [ ] SQLAlchemy basics
- [ ] Raw SQL with `psycopg2`
- [ ] Connection pooling

### Module 1.7 — FastAPI
- [ ] Route definitions, path & query params
- [ ] Pydantic request/response models
- [ ] Background tasks, middleware

### Module 1.8 — Async Programming
- [ ] `asyncio` fundamentals
- [ ] `async`/`await`, event loops
- [ ] Running async tasks concurrently (`gather`, `TaskGroup`)
- [ ] Async HTTP with `httpx`

**🏁 End state:** Build a FastAPI endpoint that calls three different LLMs in parallel, times out the slow one, and logs the result without blocking the response.

---

## Phase 02 — The Mental Model of an LLM
**Week 4 · 5 modules · Difficulty: 1/5**

> Conceptual phase. Almost no code. Where most "why is my agent broken" questions get answered six months later.

### Module 2.1 — What an LLM Actually Is
- [ ] Trained on a fixed snapshot
- [ ] Knowledge cutoff dates and what they imply
- [ ] Probabilistic generation, not retrieval
- [ ] Why the same prompt gives different outputs

### Module 2.2 — How an LLM Thinks
- [ ] Tokenization and next-token prediction
- [ ] Temperature, top-p, top-k
- [ ] Why longer = more drift

### Module 2.3 — Reasoning Models vs Base Models
- [ ] Instruct vs base models
- [ ] Chain-of-thought models (o1, DeepSeek-R1 style)
- [ ] When to use which

### Module 2.4 — Reading Model Evals & Benchmarks
- [ ] MMLU, HumanEval, GPQA
- [ ] Why benchmarks lie
- [ ] How to run your own evals

### Module 2.5 — Comparing the Major Models
- [ ] OpenAI, Anthropic, Google, open-source landscape
- [ ] Cost vs capability trade-offs
- [ ] Picking the right model for the job

**🏁 End state:** Explain to a non-technical PM why ChatGPT made up a fact, and tell a hiring panel which model to pick for which job — backed by benchmarks, not vibes.

---

## Phase 03 — Prompt Engineering & API Access
**Weeks 5–7 · 7 modules · Difficulty: 2/5**

> The pivot from "ChatGPT user" to "engineer who controls LLMs."

### Module 3.1 — UI vs API: The Hinge Moment
- [ ] Same prompt, same model, different output — why?
- [ ] System prompts you don't see
- [ ] Skills/tools the chat UI calls silently
- [ ] Why production work happens via API

### Module 3.2 — Calling LLMs via API
- [ ] OpenAI, Anthropic, Gemini SDKs
- [ ] `messages` array structure
- [ ] Streaming responses
- [ ] Error handling and retries

### Module 3.3 — Prompt Anatomy
- [ ] System / user / assistant roles
- [ ] Context injection patterns
- [ ] Token budgeting

### Module 3.4 — Core Techniques
- [ ] Zero-shot, few-shot, chain-of-thought
- [ ] Role prompting
- [ ] Output format constraints (JSON mode)

### Module 3.5 — Applied Prompt Patterns
- [ ] Persona patterns
- [ ] Decomposition & step-back prompting
- [ ] Self-consistency

### Module 3.6 — Advanced Reasoning Techniques
- [ ] Tree of Thought
- [ ] ReAct (reason + act) prompting
- [ ] Self-critique loops

### Module 3.7 — Prompt Management & Cost in Production
- [ ] Prompt versioning
- [ ] Prompt caching (Anthropic / OpenAI)
- [ ] Cost calculators, token monitoring

**🏁 End state:** Take a flaky prompt that works "sometimes" and systematically make it reliable — and cut its cost in half with caching.

---

## Phase 04 — RAG + Evaluation
**Weeks 8–12 · 9 modules · Difficulty: 4/5 · 🏆 Capstone 1**

> The longest phase. RAG looks simple in tutorials and is brutal in production.

### Module 4.1 — Why RAG Exists
- [ ] LLMs can't see your private data
- [ ] The brain-in-a-windowless-room reaches its limit
- [ ] Use cases: internal docs, company policies, recent data

### Module 4.2 — Embeddings
- [ ] What embeddings represent
- [ ] Embedding models (OpenAI, Cohere, open-source)
- [ ] Similarity search fundamentals

### Module 4.3 — Document Ingestion Pipeline
- [ ] PDF parsing with Docling
- [ ] OCR, layout detection
- [ ] Metadata extraction

### Module 4.4 — Chunking Strategies
- [ ] Fixed-size, sentence, paragraph, semantic chunking
- [ ] Chunk size trade-offs
- [ ] Sliding window overlap

### Module 4.5 — Chunk Enrichment
- [ ] Hypothetical document embeddings (HyDE)
- [ ] Summary + full chunk storage
- [ ] Entity and keyword extraction

### Module 4.6 — Vector Databases
- [ ] Pinecone, Weaviate, Qdrant, pgvector
- [ ] Indexing and filtering
- [ ] Namespace and metadata patterns

### Module 4.7 — Hybrid Retrieval & Next-Gen Retrievers
- [ ] BM25 + vector fusion (RRF)
- [ ] Reranking (Cohere, cross-encoders)
- [ ] Contextual retrieval

### Module 4.8 — Graph-Augmented RAG
- [ ] Neo4j basics for AI
- [ ] Entity graphs over documents
- [ ] Multi-hop relationship queries

### Module 4.9 — RAG Evaluation (The Part Most Courses Skip)
- [ ] Golden dataset construction
- [ ] Precision@k, Recall@k
- [ ] RAG Triad (faithfulness, answer relevance, context relevance)
- [ ] LangSmith eval harness

**🏁 End state:** Build a RAG system, measure why it's wrong, and fix it with data instead of vibes.

---

## Phase 05 — Tools, MCP & Single Agents
**Weeks 13–16 · 8 modules · Difficulty: 4/5**

> The brain gets hands and legs.

### Module 5.1 — Function Calling / Tool Use
- [ ] Tool schemas (JSON Schema, Pydantic)
- [ ] How the LLM decides which tool to call
- [ ] Parsing tool-call responses
- [ ] Handling tool errors gracefully

### Module 5.2 — Tool Design Principles
- [ ] Naming and description matters enormously
- [ ] Idempotent vs stateful tools
- [ ] Granularity: one tool per action

### Module 5.3 — MCP: Model Context Protocol
- [ ] What MCP is and why it exists
- [ ] MCP servers and clients
- [ ] Building a custom MCP server

### Module 5.4 — The ReAct Pattern
- [ ] Reason → Act → Observe loop
- [ ] Thought / Action / Observation format
- [ ] Implementing ReAct from scratch

### Module 5.5 — LangChain Agents
- [ ] AgentExecutor
- [ ] Structured chat agent
- [ ] Custom tools with `@tool`

### Module 5.6 — Human in the Loop
- [ ] Confirmation before destructive actions
- [ ] Interrupt / approval patterns in LangGraph
- [ ] When to pause and ask

### Module 5.7 — Tool Security
- [ ] Prompt injection via tool results
- [ ] Sandboxing code execution
- [ ] Read-only enforcement

### Module 5.8 — Computer Use & App SDKs
- [ ] Anthropic Computer Use API
- [ ] Browser automation with Playwright
- [ ] Vision + action loops

**🏁 End state:** Build a single agent that searches the web, reads internal docs, queries a DB, and emails you a summary — and stops if it tries to do something dumb.

---

## Phase 06 — Memory + Context Engineering
**Weeks 17–19 · 7 modules · Difficulty: 4/5**

> The hardest conceptual phase. Easy to do badly, expensive when you do. Worth every hour of attention.

### Module 6.1 — The Context Window as Working Memory
- [ ] Why agents "forget" mid-conversation
- [ ] Token budgeting per section
- [ ] The lost-in-the-middle problem
- [ ] Recency bias

### Module 6.2 — Context Structure: SYSTEM / CONTEXT / USER Separation
- [ ] Why structure matters
- [ ] Ordering for reliability
- [ ] XML tags for clear boundaries

### Module 6.3 — Short-Term Memory: Session History
- [ ] Conversation trimming strategies
- [ ] Summary buffers
- [ ] LangChain memory classes

### Module 6.4 — Semantic Caching
- [ ] Vector-similarity cache layer
- [ ] GPTCache / Redis + embeddings
- [ ] Cache invalidation patterns

### Module 6.5 — Episodic Memory
- [ ] Storing and retrieving past interactions
- [ ] Memory scoring and pruning
- [ ] MemGPT / Letta patterns

### Module 6.6 — Context Compression
- [ ] LLMLingua, RECOMP
- [ ] Selective context inclusion
- [ ] Compressing tool outputs

### Module 6.7 — Long-Term Memory
- [ ] Entity memory across sessions
- [ ] User preference storage
- [ ] Mem0 and similar libraries

**🏁 End state:** Explain why your agent forgot what you said three turns ago, and fix it with the right memory layer instead of throwing more tokens at it.

---

## Phase 07 — Multi-Agent Orchestration
**Weeks 20–22 · 8 modules · Difficulty: 5/5 · 🏆 Capstone 2**

> When one agent isn't enough.

### Module 7.1 — When to Go Multi-Agent (and When Not To)
- [ ] Single-agent-with-tools beats multi-agent for ~80% of tasks
- [ ] Multi-agent earns its weight when steps need different prompts/tools
- [ ] The Tableau→QuickSight conversion case study

### Module 7.2 — LangGraph Fundamentals
- [ ] State machines and graphs
- [ ] Nodes, edges, conditional routing
- [ ] Checkpointing and persistence

### Module 7.3 — Common Patterns
- [ ] Supervisor / worker pattern
- [ ] Pipeline / sequential pattern
- [ ] Parallel fan-out

### Module 7.4 — Agent-as-Tool: The Lightweight Alternative
- [ ] Wrapping agents as tools for a parent agent
- [ ] When this is enough
- [ ] Handoff protocols

### Module 7.5 — State Management
- [ ] Shared state vs private state
- [ ] TypedDict state schemas
- [ ] Reducers for concurrent updates

### Module 7.6 — A2A: Agent-to-Agent Protocol
- [ ] Google A2A protocol overview
- [ ] Agent cards and capability discovery
- [ ] Cross-framework agent communication

### Module 7.7 — Frameworks Compared
- [ ] LangGraph vs CrewAI vs AutoGen vs custom
- [ ] When to use which
- [ ] Vendor lock-in trade-offs

### Module 7.8 — Debugging Multi-Agent Systems
- [ ] LangSmith tracing for graphs
- [ ] Identifying infinite loops
- [ ] Replay and time-travel debugging

**🏁 End state:** Design a multi-step agent workflow on a whiteboard, build it in LangGraph, and debug it when one node loops infinitely.

---

## Phase 08 — Guardrails + LLMOps
**Weeks 23–24 · 4 modules · Difficulty: 3/5**

> Make it not embarrass you in production — measure failure, catch it before users do, and prove the agent is improving release-over-release.

### Module 8.1 — Three-Layer Guardrail Architecture
- [ ] Input guardrails (gateway, <1ms, deterministic): prompt-injection regex, PII redaction, toxic filter
- [ ] Output guardrails (LLM-judge OK): faithfulness, contradiction check, medical/legal disclaimers
- [ ] Action guardrails (inside tools): max retries, max tool calls, query validation, read-only DB

### Module 8.2 — AWS Bedrock Guardrails
- [ ] Content filters and topic filters
- [ ] Grounding checks
- [ ] PII detection and redaction

### Module 8.3 — LLMOps: Observability
- [ ] LangSmith tracing and datasets
- [ ] Arize / Helicone / Langfuse
- [ ] Latency, cost, token dashboards

### Module 8.4 — LLMOps: Evaluation in Production
- [ ] Online vs offline evals
- [ ] LLM-as-judge patterns
- [ ] Regression testing on golden sets

**🏁 End state:** Put a number on how often your agent fails, and ship it anyway with confidence.

---

## Phase 09 — Cloud Infrastructure & Deployment
**Weeks 25–26 · 6 modules · Difficulty: 3/5 · 🏆 Capstone 3**

> The final mile. Minimum AWS to make everything earlier deployable, and how to put an agent in production while keeping costs sane.

### Module 9.1 — Storage & Data
- [ ] S3 — durable object storage, document lakes
- [ ] RDS PostgreSQL — managed relational DB for agent state
- [ ] DynamoDB — KV state for ingestion pipelines

### Module 9.2 — Compute
- [ ] ECS Fargate — serverless containers
- [ ] Lambda — event-driven tools
- [ ] EC2 basics when you need it

### Module 9.3 — Networking & Access
- [ ] VPC, subnets, security groups
- [ ] API Gateway
- [ ] IAM roles and least-privilege policies

### Module 9.4 — AI-Specific Services (and Other Clouds)
- [ ] AWS Bedrock — models, embeddings, Knowledge Bases
- [ ] AWS AgentCore
- [ ] Vertex AI / Azure OpenAI as alternatives

### Module 9.5 — Deployment & Realtime Delivery
- [ ] Docker + ECR
- [ ] CI/CD with GitHub Actions
- [ ] SSE / WebSocket token streaming

### Module 9.6 — Cost & Capacity Control
- [ ] Cost Explorer and budgets
- [ ] Autoscaling policies
- [ ] Prompt caching at scale

**🏁 End state:** Dockerize any earlier project, deploy to ECS Fargate behind API Gateway, manage secrets, stream tokens to a chat UI, load-test it, and watch the cost dashboard move only when it should.

---
<!-- section: // Capston Projects -->

## Capstone 1 — Distributed Document Ingestion + RAG Pipeline
**Built during Phase 4 · Weeks 10–12**  
*Domain: Unstructured document Q&A (legal, pharma, technical docs)*  
`Docling` `Pinecone` `Neo4j` `ECS Fargate` `DynamoDB` `S3` `Bedrock` `LangSmith`

- [ ] PDF ingestion: Docling layout detection → semantic chunking → PII redaction → entity extraction → embeddings → Pinecone + Neo4j
- [ ] Distributed async workers on ECS Fargate processing thousands of PDFs concurrently
- [ ] DynamoDB state tracking per document (queued / processing / done / failed)
- [ ] Hybrid retrieval (vector + BM25 + graph) with reranking
- [ ] Evaluation harness with golden dataset, Precision@k / Recall@k / RAG Triad
- [ ] FastAPI Q&A endpoint with citation-backed answers

**Proves:** You can build production RAG, not a Streamlit demo.

---

## Capstone 2 — Multi-Agent Natural Language → SQL on E-commerce Data
**Built during Phase 7 · Weeks 21–22**  
*Domain: E-commerce analytics for non-technical users*  
`LangChain` `LangGraph` `LangSmith` `AgentCore` `RDS PostgreSQL` `FastAPI` `Streamlit` `Bedrock`

- [ ] Multi-agent: Planner → SQL Writer → Validator → Executor → Explainer
- [ ] Schema-aware context injection per query (only relevant tables sent to writer)
- [ ] LangGraph orchestration with conditional routing and retry loops
- [ ] Read-only DB enforcement, query timeout, max-row caps
- [ ] Streamlit frontend, FastAPI backend, RDS PostgreSQL with realistic data
- [ ] Benchmarked on a golden NLQ test set, target 85%+ accuracy

**Proves:** You can orchestrate multiple specialised agents safely against real production data.

---

## Capstone 3 — Clinical Trials Knowledge Base
**Built during Phases 8–9 · Weeks 23–26**  
*Domain: Life sciences AI (substitute legal, finance, or your industry)*  
`LangChain` `LangGraph` `Neo4j` `Pinecone` `Bedrock` `AgentCore` `Lambda` `S3` `LangSmith` `MLflow`

- [ ] Real ClinicalTrials.gov dataset ingestion (or domain equivalent)
- [ ] Hybrid knowledge layer: Pinecone for unstructured PDFs + Neo4j for trial-drug-condition relationships
- [ ] Multi-hop relationship queries ("what other trials used drug X for condition Y?")
- [ ] Full three-layer guardrails — disclaimer auto-injection, contradiction checks, action limits
- [ ] Evidence-backed answers — every claim cites the source chunk
- [ ] Deployed on AWS with monitoring, regression tests in CI, semantic cache, cost dashboard

**Proves:** You can ship an agent into a regulated domain without it killing anyone (or your career).

---

## 📚 Resources

- [Original Roadmap](https://ch-balaji.github.io/ai-engineer-roadmap/) by Balaji Chippada
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [LangChain Docs](https://docs.langchain.com)
- [LangSmith](https://smith.langchain.com)
- [AWS Bedrock](https://aws.amazon.com/bedrock/)

---

*Started: · Target completion: 26 weeks from start*
