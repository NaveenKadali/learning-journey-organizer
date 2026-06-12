# Backend Engineer Journey · 2026 Roadmap

> **5 weeks · 2 phases · 10 modules · 1 capstones**  

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
<!-- section: // Capston Projects -->


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
