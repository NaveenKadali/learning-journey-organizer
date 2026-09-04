# Automation Tester → SDET Roadmap: Beginner → Expert
*Python-only. This roadmap starts you as a manual/automation tester first, builds deep automation-engineering skill, and only then transitions you into full SDET (software-engineering-grade quality engineering). Nothing assumes prior coding or testing background — no basics are skipped.*

---

> # 1. Dependencies, Blockers & the Highest-ROI Learning Sequence
*Read this section first. It exists specifically to flag bottlenecks before you hit them.*

## 1.1 The One-Line Sequence
`Testing fundamentals & manual testing craft → Python programming fundamentals → Git → SQL basics → Automation fundamentals (pytest + Selenium) → API test automation → Framework design & Page Object Model → CI/CD integration → Advanced UI automation (Playwright) → BDD → Mobile automation → [AUTOMATION TESTER COMPETENCY REACHED] → Software engineering depth (DS&A, design patterns, architecture) → Test architecture & framework engineering → Contract/microservices testing → Performance testing → Security testing → Cloud/DevOps for SDETs → [SDET COMPETENCY REACHED] → Test strategy leadership → Distributed systems/chaos testing → Platform engineering → AI-augmented testing → Quality leadership.`

## 1.2 Why This Order — The ROI Logic
- **Manual testing craft before any code.** Test design techniques (equivalence partitioning, boundary analysis, risk-based testing) and formal bug reporting are cheap to learn and are the *thinking* skill that automation code either amplifies or wastes. An automation engineer who never learned to design a good test case writes tests that execute a lot of code but catch few real bugs. This is the single most commonly skipped step by self-taught automation engineers — don't skip it.
- **Python before any automation tool.** Selenium/pytest/Appium are just APIs on top of a programming language. Trying to learn Selenium syntax while still shaky on Python loops/functions/OOP means you're learning two things badly at once. Get comfortable in Python first.
- **Git early, always.** Every following phase produces code that needs version control. Learn it once, early, properly.
- **SQL before database-dependent testing.** You cannot validate backend test data or write meaningful integration assertions without basic SQL.
- **API automation *before* deep UI automation.** APIs are simpler, faster, and more stable than UI automation — they're the highest-ROI place to build your first real automation skill and framework-design instincts, and the testing-pyramid mindset you build here keeps your later UI suite lean instead of bloated.
- **Framework design and CI/CD are not "advanced" — pull them in early.** A test suite that isn't in a reusable framework and doesn't run in CI provides limited real value in a job. Don't treat these as optional polish; they're core automation-tester competencies.
- **"Automation Tester" competency is reached before "SDET" begins.** This is the core structural choice of this roadmap: you become a strong, employable, complete Automation Tester first (UI+API+Mobile automation, CI/CD, BDD, reporting) — a real, hireable milestone — and only then layer in the software-engineering depth (architecture, distributed systems, performance, security, chaos engineering, platform building) that defines an SDET.
- **Software engineering depth (DS&A, design patterns) is deferred to the SDET transition, not front-loaded**, because at the Automation Tester stage you need just enough Python to write good test code — deep CS fundamentals pay off once you're designing frameworks and contributing to system-level test architecture, not before.
- **Performance and security testing come after functional automation is solid.** You can't meaningfully stress-test or security-test a system's behavior until you deeply understand its normal behavior — which functional automation teaches you.
- **Leadership/strategy topics are last** because they require real system and team experience to be more than theory.

## 1.3 Critical Blockers to Know About in Advance
1. **Do not start Selenium/Playwright before Python fundamentals (Phase 2) are solid.** This is the #1 reason self-taught automation learners stall — fighting Python syntax and browser automation simultaneously.
2. **Do not attempt framework design (Phase 8) before you've written at least 30-40 individual test functions manually.** Framework abstractions only make sense once you've felt the pain they solve.
3. **Do not attempt performance/security testing (Advanced level) before functional API/UI automation is fully solid** — these are diagnostic skills layered on top of functional understanding.
4. **CI/CD (Phase 9) requires basic Git (Phase 3) and a working test suite (Phases 6-8)** — sequence-locked, cannot be reordered.
5. **Contract testing and microservices testing (Advanced level) require basic backend/API architecture literacy** — pick this knowledge up as part of Phase 16-17 if you don't already have it.

## 1.4 Time Allocation Guideline (15-20 hrs/week)
| Level | Focus | Duration | Cumulative |
|---|---|---|---|
| Beginner | Manual testing + Python fundamentals | 2 months | 2 months |
| Beginner→Intermediate | Automation Tester foundations | 2.5 months | 4.5 months |
| Intermediate | Automation Tester proficiency (job-ready milestone) | 3 months | 7.5 months |
| Advanced | SDET transition | 6-7 months | ~14-15 months |
| Expert | SDET leadership/architect (ongoing) | 12+ months | 2.5+ years |

---

> # 2. LEVEL: BEGINNER — Testing Foundations & Programming Basics
*Dependency: None. Start here regardless of background.*

**End Expectation:** You understand testing as a formal discipline (not "clicking around looking for bugs"), can write professional test cases and bug reports, and are comfortable writing structured Python code. You are not yet automating anything — that's intentional.

## 2.1 Phase 0 — Environment & Tooling Setup
- [ ] Install a proper OS environment: Linux native, macOS, or WSL2 on Windows
- [ ] Install Python 3.12+ via `pyenv` (not relying on system Python)
- [ ] Install VS Code or PyCharm; set up basic linting (`ruff`) and formatting (`black`)
- [ ] Learn essential terminal commands: `ls, cd, pwd, mkdir, rm, mv, cp, cat, grep, find, chmod, ps, kill`
- [ ] Install and configure `git`; create a GitHub account

## 2.2 Phase 1 — Software Testing Fundamentals (The Thinking Layer)
*This is the foundation everything else stands on. Do not rush it.*

#### 2.2.1 Core Testing Concepts
- [ ] What is software testing; why it exists; cost of defects by phase (the earlier a bug is found, the cheaper it is to fix — understand this economically, not just as a slogan)
- [ ] Verification vs Validation
- [ ] Testing levels: unit, integration, system, acceptance testing
- [ ] Testing types: functional vs non-functional; positive vs negative testing; smoke, sanity, regression, retesting, exploratory, ad-hoc testing — know the precise definition of each, they are frequently confused
- [ ] Static testing (reviews, walkthroughs, inspections) vs dynamic testing
- [ ] The Testing Pyramid (unit → integration → E2E/UI) — why more tests should live at the bottom

#### 2.2.2 SDLC & STLC
- [ ] Software Development Life Cycle models: Waterfall, V-Model, Agile/Scrum, Iterative — what changes for testing in each
- [ ] Software Testing Life Cycle (STLC): requirement analysis → test planning → test case design → environment setup → test execution → test closure
- [ ] Test Plan document: what it contains (scope, approach, resources, schedule, entry/exit criteria, risks)
- [ ] Entry criteria vs exit criteria vs suspension criteria for a test cycle

#### 2.2.3 Requirement Analysis for Testers
- [ ] Reading and analyzing requirements/user stories for testability
- [ ] Identifying ambiguous or incomplete requirements (a critical, underrated tester skill)
- [ ] Acceptance criteria — writing and reviewing them

#### 2.2.4 Test Design Techniques (Black-Box)
- [ ] Equivalence Partitioning
- [ ] Boundary Value Analysis
- [ ] Decision Table Testing
- [ ] State Transition Testing
- [ ] Use Case Testing
- [ ] Error Guessing (experience-based technique)
- [ ] Pairwise/combinatorial testing for reducing large input combinations

#### 2.2.5 Test Case Design & Documentation
- [ ] Anatomy of a formal test case: ID, title, preconditions, steps, test data, expected result, actual result, status
- [ ] Writing clear, atomic, repeatable test cases
- [ ] Traceability matrix: mapping test cases back to requirements
- [ ] Test case prioritization (risk-based: impact × likelihood)

#### 2.2.6 Defect Management
- [ ] Defect life cycle: New → Assigned → Open → Fixed → Retest → Closed/Reopened → (Duplicate/Rejected/Deferred branches)
- [ ] Severity vs Priority — the distinction that trips up almost every beginner
- [ ] Writing a high-quality bug report: clear title, environment, repro steps, expected vs actual result, evidence (screenshots/logs), severity
- [ ] Root cause analysis basics — going beyond "it's broken" to "why is it broken"

## 2.3 Phase 2 — Python Programming Fundamentals
*Dependency: Phase 0 complete. Can run in parallel with Phase 1.*

#### 2.3.1 Core Python Syntax
- [ ] Variables, data types (int, float, str, bool, None), type casting
- [ ] Operators: arithmetic, comparison, logical
- [ ] Control flow: `if/elif/else`, `for`, `while`, `break/continue/pass`
- [ ] Data structures: `list, tuple, dict, set` — methods, comprehensions, slicing/indexing
- [ ] Strings: formatting (f-strings), common methods, intro to regex (`re` module)
- [ ] Functions: parameters, default values, `*args/**kwargs`, return values, scope
- [ ] Exception handling: `try/except/else/finally`, raising exceptions, custom exceptions
- [ ] File I/O: reading/writing text files, working with JSON/CSV/YAML (formats you'll use constantly in test data)
- [ ] Modules & packages, virtual environments (`venv`), `pip`, `requirements.txt`

#### 2.3.2 Object-Oriented Programming
- [ ] Classes and objects, `__init__`, instance vs class attributes/methods
- [ ] Encapsulation, inheritance, polymorphism
- [ ] `@classmethod`, `@staticmethod`, `@property`
- [ ] Dunder methods relevant to testing code (`__str__`, `__repr__`, `__eq__`)
- [ ] Why OOP matters specifically for automation: this is the foundation of the Page Object Model pattern you'll learn later — internalize it now

#### 2.3.3 Intermediate Python Mechanics
- [ ] Iterators & generators (`yield`)
- [ ] Decorators (you'll see these constantly in pytest — `@pytest.fixture`, `@pytest.mark.parametrize`)
- [ ] Context managers (`with` statement, `__enter__`/`__exit__`) — critical for managing browser sessions/DB connections cleanly
- [ ] List/dict comprehensions, `lambda`, `map`/`filter`
- [ ] Type hints (`typing` module) — increasingly expected in professional test code
- [ ] Logging module (`logging`) — replacing `print()` debugging, essential for automation debugging later

#### 2.3.4 Python Best Practices (Beginner Level)
- [ ] PEP 8 style guide; using `black`/`ruff` for consistent formatting
- [ ] Writing docstrings
- [ ] Meaningful naming conventions
- [ ] Keeping functions small and single-purpose

## 2.4 Phase 3 — Git & Version Control
*Dependency: Phase 0 complete.*

- [ ] Core concepts: repository, commit, branch, merge, remote
- [ ] Commands: `init, clone, add, commit, push, pull, fetch, branch, checkout/switch, merge, log, diff, stash`
- [ ] Writing clear commit messages
- [ ] Resolving merge conflicts
- [ ] `.gitignore`
- [ ] GitHub workflow: forks, pull requests, code review basics, issues
- [ ] **End goal:** Comfortable pushing code, branching, and opening a PR without hesitation — this is a hard requirement before Phase 5 (automation) begins

## 2.5 Phase 4 — Web, HTTP & Database Fundamentals for Testers
*Dependency: Phase 2 (Python) helps but isn't strictly required for this phase's concepts.*

#### 2.5.1 How the Web Works
- [ ] Client-server model
- [ ] HTTP protocol: methods (`GET, POST, PUT, PATCH, DELETE`), status codes (know the full 2xx/3xx/4xx/5xx ranges and what each means), headers, request/response anatomy
- [ ] URLs, query params, path params
- [ ] Cookies & sessions (conceptual)
- [ ] JSON as the standard data interchange format
- [ ] Using browser DevTools (Network tab) to inspect real requests — a foundational tester skill

#### 2.5.2 SQL Fundamentals for Testers
- [ ] Relational database basics: tables, rows, columns, primary/foreign keys
- [ ] DDL basics: `CREATE, ALTER, DROP TABLE` (enough to set up test data environments)
- [ ] DML: `SELECT, INSERT, UPDATE, DELETE`
- [ ] Filtering & sorting: `WHERE, ORDER BY, LIMIT`
- [ ] Aggregation: `GROUP BY, HAVING, COUNT, SUM, AVG`
- [ ] Joins: `INNER, LEFT, RIGHT` — enough to validate data across related tables
- [ ] Using SQL to independently verify backend test results (not trusting the UI/API alone)

## 2.6 Phase 4.5 — Professional & Soft Skills (Cross-Cutting — Start Now, Continue Always)
*These are not "extra" — they determine whether your technical skill translates into real job performance. Revisit this module at every level.*

- [ ] Written communication: clear bug reports, clear Slack/email updates, clear documentation
- [ ] Asking good clarifying questions when requirements are ambiguous (rather than guessing or blocking silently)
- [ ] Basic Agile/Scrum participation: sprint planning, daily standups, sprint review, retrospectives — understanding a tester's role in each ceremony
- [ ] Collaborating with developers: how to report issues in a way that's fast to reproduce and fix, not adversarial
- [ ] Time management & estimation: giving realistic testing-effort estimates
- [ ] Building a "quality mindset": testing is about preventing defects and reducing risk, not just finding bugs after the fact

### 2.7 Beginner-Level End Expectations Checklist
- [ ] Can write a professional test plan and formal test cases for a real feature
- [ ] Applies test design techniques deliberately, not randomly
- [ ] Writes a bug report a developer can act on without asking clarifying questions
- [ ] Comfortable writing structured, OOP-capable Python code without references
- [ ] Understands HTTP and can read/interpret any API request/response
- [ ] Can write SQL queries with joins and aggregation to verify data independently
- [ ] Uses Git/GitHub confidently for any code work going forward

---

# 3. LEVEL: BEGINNER → INTERMEDIATE — Automation Tester Foundations
*Dependency: Level 2 (Beginner) fully complete — especially Python fundamentals and Git.*

**End Expectation:** You can automate real test cases for both APIs and web UIs, structure them into a basic reusable framework, and explain *why* you built it that way. This is your first genuinely automatable, portfolio-worthy skill set.

## 3.1 Phase 5 — Testing Framework Basics: pytest
*Dependency: Python OOP/decorators (2.3.2, 2.3.3).*

#### 3.1.1 pytest Fundamentals
- [ ] Installing pytest, writing your first `test_*.py` file, naming conventions (`test_` prefix requirement)
- [ ] `assert` statements and pytest's assertion introspection
- [ ] Running tests: CLI flags (`-v`, `-k`, `-m`, `-x`, `--tb`)
- [ ] Test organization: grouping tests into classes vs plain functions
- [ ] Fixtures: `@pytest.fixture`, fixture scope (`function/class/module/session`), `yield` fixtures for setup/teardown
- [ ] Parametrization: `@pytest.mark.parametrize` — running one test against many data sets (a core automation skill)
- [ ] Markers: `skip`, `skipif`, `xfail`, custom markers for test selection
- [ ] `conftest.py` for sharing fixtures across test files

#### 3.1.2 unittest (Know It Exists)
- [ ] Basic familiarity with Python's built-in `unittest` module and `TestCase` class — many legacy codebases use it; know enough to read and adapt it, even if pytest is your primary tool

## 3.2 Phase 6 — API Test Automation (Your First Real Automation Skill)
*Dependency: Phase 4.5.1 (HTTP fundamentals) + Phase 5 (pytest).*
*This comes before UI automation deliberately — APIs are faster, more stable, and teach framework thinking without fighting browser flakiness.*

#### 3.2.1 Making and Validating API Requests in Python
- [ ] `requests` library: GET/POST/PUT/PATCH/DELETE, headers, query params, request bodies, timeouts
- [ ] Parsing and asserting on JSON responses
- [ ] Status code assertions, header assertions
- [ ] Authentication in API tests: API keys, Bearer tokens, Basic Auth
- [ ] Handling and asserting on error responses (negative testing applied to APIs)

#### 3.2.2 Structuring API Tests
- [ ] Organizing tests by resource/endpoint
- [ ] Using fixtures for auth tokens, base URLs, and reusable test data
- [ ] Data-driven API tests via `@pytest.mark.parametrize` and external JSON/YAML test data files
- [ ] Basic JSON schema validation (`jsonschema` library) to check response *structure*, not just values
- [ ] Environment configuration: testing against dev/staging without hardcoding URLs

#### 3.2.3 Tools
- [ ] **Postman**: building collections manually first (understand the tool non-programmers use, since you'll collaborate with manual QA who use it), environments, basic scripting in Postman
- [ ] **Newman**: running Postman collections from the CLI (a bridge toward CI integration)
- [ ] Reading a Swagger/OpenAPI spec to know what to test

## 3.3 Phase 7 — Web UI Automation Fundamentals
*Dependency: Phase 5 (pytest) + Phase 6 concepts (you should already think in terms of structured, assertive tests).*

#### 3.3.1 Web Fundamentals for UI Automation
- [ ] HTML structure basics: tags, attributes, the DOM tree
- [ ] CSS selectors: id, class, attribute, descendant/child selectors
- [ ] XPath basics: absolute vs relative paths, common functions (`contains`, `text()`)
- [ ] Using browser DevTools to inspect and choose reliable locators

#### 3.3.2 Selenium WebDriver
- [ ] WebDriver setup and driver management (`webdriver-manager` or Selenium Manager)
- [ ] Locating elements: `find_element`/`find_elements` with all locator strategies
- [ ] Interacting with elements: click, type, clear, select dropdowns, checkboxes/radio buttons
- [ ] Waits: implicit vs explicit waits — **always prefer explicit** (`WebDriverWait` + `expected_conditions`); understand why implicit waits cause subtle bugs
- [ ] Handling alerts/popups, multiple windows/tabs, iframes
- [ ] Taking screenshots on failure (critical for debugging)
- [ ] Browser navigation: back/forward/refresh, managing cookies

#### 3.3.3 First Real UI Test Suite (Unstructured — Intentional)
- [ ] Automate 5-10 real test cases end-to-end (e.g., login, search, form submission) as standalone scripts before learning framework patterns
- [ ] **Why unstructured first:** you need to personally feel the pain of duplicated code and brittle locators before the Page Object Model (next phase) will make intuitive sense

## 3.4 Phase 8 — Basic Framework Design: Page Object Model
*Dependency: Phase 7.3 — you must have felt the pain of unstructured UI scripts first (see blocker #2 in Section 1.3).*

- [ ] Page Object Model (POM) pattern: one class per page, encapsulating locators and actions
- [ ] Separating test logic (assertions, test flow) from page interaction logic (locators, actions)
- [ ] Base Page class for shared behavior (navigation, common waits)
- [ ] Refactoring your Phase 7.3 scripts into a POM-based structure — directly compare before/after to internalize the value
- [ ] Combining API setup (Phase 6) with UI tests (e.g., create test data via API, then verify it in the UI) — a very common real-world pattern

## 3.5 Phase 9 — Version-Controlled, CI-Integrated Test Suites
*Dependency: Phase 3 (Git) + a working suite from Phases 6-8.*

- [ ] Structuring a test automation repo properly: `tests/`, `pages/`, `api_clients/`, `config/`, `utils/`
- [ ] Managing test dependencies with `requirements.txt` or `pyproject.toml`
- [ ] Running your suite in GitHub Actions: writing your first CI workflow YAML
- [ ] Running headless browser tests in CI
- [ ] Basic test reporting: HTML reports (`pytest-html`), JUnit XML output
- [ ] Understanding why "tests that only run on my laptop" have limited value to a team

## 3.6 Phase 9.5 — Test Management & Collaboration Tools
*Dependency: Can run in parallel with the rest of this level.*

- [ ] Bug/issue tracking tools: Jira fundamentals (creating tickets, linking to test cases, workflows)
- [ ] Test case management tools: TestRail/Zephyr/Xray basics — organizing test suites, linking automated results back to test management systems
- [ ] Basic experience contributing to/reading a shared team test plan in a real or simulated tool

### 3.7 Beginner→Intermediate End Expectations Checklist
- [ ] Has built and can explain a Page-Object-Model UI automation suite from scratch
- [ ] Has built a structured API test automation suite with data-driven tests and schema validation
- [ ] Suite runs in CI (GitHub Actions) with reports generated automatically
- [ ] Comfortable with both Postman (for ad-hoc/manual API exploration) and code-based API automation
- [ ] Understands and has practiced writing/organizing tickets in Jira and test cases in a test management tool
- [ ] Has 2 portfolio projects: an API automation suite, a UI automation suite (POM-based)

---

# 4. LEVEL: INTERMEDIATE — Automation Tester Proficiency
*Dependency: Level 3 fully complete. This is the level at which "Automation Tester" as a job title is fully, comfortably achieved.*

**End Expectation:** You can independently own automation for a real product across UI, API, and mobile; integrate BDD where useful; run suites reliably in CI with good reporting; and collaborate fluently with developers and manual QA. You are fully job-ready for Automation Tester / SDET-I roles.

## 4.1 Phase 10 — Advanced Web UI Automation: Playwright
*Dependency: Selenium fundamentals (Phase 7) and POM (Phase 8) — Playwright concepts map directly onto what you already know, with better ergonomics.*

- [ ] Why Playwright: built-in auto-waiting, better reliability, network interception, tracing tools — understand the concrete problems it solves versus Selenium
- [ ] Playwright Python API: `sync` vs `async` API, browser contexts, pages
- [ ] Locators: Playwright's recommended locator strategies (role-based, text-based) vs raw CSS/XPath
- [ ] Auto-waiting behavior — understanding what it does and does not solve (you still need to design tests carefully)
- [ ] Network interception: mocking/stubbing API responses to test UI edge cases without needing backend cooperation
- [ ] Playwright's Trace Viewer and video recording for debugging failures
- [ ] Cross-browser testing: Chromium, Firefox, WebKit from one codebase
- [ ] Playwright Test Runner vs using Playwright with pytest (`pytest-playwright`) — know both, understand tradeoffs
- [ ] Visual comparison basics (screenshot assertions) — awareness level, know when it's useful vs noisy

## 4.2 Phase 11 — Advanced API Test Automation & Framework Maturity
*Dependency: Phase 6 (API basics) — this phase deepens it substantially.*

- [ ] Building a proper API client layer: base client class handling auth/headers/base URL/logging, resource-specific clients built on top
- [ ] Response model validation with Pydantic (moving beyond raw dict assertions to typed validation)
- [ ] Testing full CRUD flows with state verification at each step
- [ ] Testing authentication/authorization flows thoroughly: token expiry, refresh flows, role-based access checks across endpoints
- [ ] Testing pagination, filtering, sorting parameters systematically
- [ ] Idempotency testing (repeated identical requests)
- [ ] Mocking external HTTP dependencies in tests (`responses` or `respx` libraries) to isolate what you're actually testing

## 4.3 Phase 12 — Behavior-Driven Development (BDD)
*Dependency: Phases 6-11 — BDD is a layer on top of existing automation skill, not a replacement.*

- [ ] Gherkin syntax: `Feature`, `Scenario`, `Given/When/Then`, `Scenario Outline` with `Examples`
- [ ] `behave` or `pytest-bdd`: writing step definitions, mapping Gherkin to your existing Page Objects/API clients
- [ ] When BDD adds real value (living documentation, stakeholder collaboration) vs when it's unnecessary overhead
- [ ] Organizing and reusing step definitions across features without duplication

## 4.4 Phase 13 — Database Testing & Test Data Management
*Dependency: SQL fundamentals (Phase 4.5.2).*

- [ ] Writing automated DB verification steps in Python (`psycopg2`/SQLAlchemy Core, `pymongo` for NoSQL)
- [ ] Test data setup/teardown strategies: direct DB seeding vs API-based setup vs fixtures/factories (`factory_boy`, `Faker`)
- [ ] Ensuring test isolation: cleaning up data after tests, avoiding order-dependent test failures
- [ ] Testing against a dedicated test database/schema, never production

## 4.5 Phase 14 — Mobile Test Automation
*Dependency: Solid UI automation mental model from Phases 7-10 (POM transfers directly).*

#### 4.5.1 Mobile Fundamentals
- [ ] Native vs Hybrid vs Cross-platform apps — what changes for testing each
- [ ] Emulators/simulators vs real devices; Android vs iOS testing environment basics
- [ ] Mobile-specific considerations: gestures, device rotation, permissions, push notifications, app state transitions

#### 4.5.2 Appium
- [ ] Appium architecture (client-server, WebDriver protocol for mobile)
- [ ] `Appium-Python-Client` setup
- [ ] Locator strategies for mobile (accessibility ID, UiAutomator2 for Android, XCUITest for iOS)
- [ ] Page Object Model adapted for mobile screens
- [ ] Handling gestures (swipe, tap, pinch) via W3C Actions
- [ ] Running on cloud device farms (BrowserStack/Sauce Labs App Automate) for real device coverage in CI

## 4.6 Phase 15 — CI/CD Maturity & Reporting
*Dependency: Phase 9 (basic CI) — this phase deepens it.*

- [ ] Parallel test execution (`pytest-xdist`) to control pipeline runtime
- [ ] Splitting suites by purpose in the pipeline: smoke tests on every commit, full regression nightly
- [ ] Flaky test handling: retries (`pytest-rerunfailures`), quarantine strategies, tracking flakiness trends over time
- [ ] Rich reporting: Allure reports (step-by-step visual reports stakeholders can read), integrating results into team dashboards
- [ ] Notifications: Slack/email alerts on pipeline failures
- [ ] Docker basics for test environments: running your suite (and dependent services like a test DB) via `docker-compose` for consistent local/CI environments

### 4.7 Intermediate-Level (Automation Tester Milestone) End Expectations Checklist
- [ ] Owns automation across UI (Playwright), API, Database, and Mobile for a real or realistic product
- [ ] Has a mature, reusable framework with clear separation of concerns (pages/clients/config/utils)
- [ ] Suite runs reliably in CI with parallelization, flaky-test handling, and rich reporting
- [ ] Has used BDD where it adds real collaboration value
- [ ] Comfortable with Docker for consistent test environments
- [ ] **This is the point at which you are a fully competent, hireable Automation Tester.** Levels 5-6 below build SDET-specific software-engineering depth on top of this foundation.

---

# 5. LEVEL: ADVANCED — Transitioning from Automation Tester to SDET
*Dependency: Level 4 fully complete. This is where software-engineering depth is deliberately layered on top of your automation craft.*

**End Expectation:** You think and build like a software engineer who specializes in quality — designing test architecture, testing distributed/microservices systems, running performance and security testing, and operating comfortably with cloud/DevOps tooling. Ready for Senior Automation Engineer / SDET / SDET II roles.

## 5.1 Phase 16 — Software Engineering Depth for SDETs
*Dependency: Python fundamentals (Level 2) — this phase goes far beyond them.*

#### 5.1.1 Data Structures & Algorithms
- [ ] Core data structures: arrays, linked lists, stacks, queues, hash maps, trees, graphs
- [ ] Core algorithms: sorting, searching, recursion, BFS/DFS
- [ ] Big-O notation: analyzing time/space complexity of your own automation code (e.g., why an O(n²) test-data lookup slows your suite down at scale)
- [ ] **Why this matters for SDETs specifically:** SDET interviews at product/FAANG-style companies include real coding rounds — this is no longer optional at the SDET level

#### 5.1.2 Design Patterns & Principles (Applied to Test Code)
- [ ] SOLID principles applied to test frameworks
- [ ] Factory pattern (test data/object creation), Builder pattern (complex payload/page construction), Strategy pattern (swappable test behaviors per environment), Singleton (shared resources like driver instances)
- [ ] DRY/KISS/YAGNI applied critically — over-engineering a test framework is a real, common failure mode
- [ ] Treating test code with the same quality bar as production code: code review, refactoring, technical debt awareness

#### 5.1.3 Broader Programming Literacy
- [ ] Reading and understanding the application codebase you're testing (at least enough to read a Django/FastAPI-style backend or a React-style frontend and reason about likely failure points)
- [ ] Basic understanding of how the systems you test are built (client-server architecture, REST principles, async processing) — enough to design tests that target real architectural risk, not just surface behavior

## 5.2 Phase 17 — Test Architecture & Framework Engineering
*Dependency: 5.1 + your existing framework from Level 4.*

- [ ] Designing a hybrid framework: combining data-driven, keyword-driven, and BDD elements as appropriate
- [ ] Building a shared "core" library used across UI, API, and Mobile suites (common config, logging, reporting, environment management) — consolidating what you built separately at Level 4
- [ ] Writing custom pytest plugins/hooks (`pytest_configure`, `pytest_collection_modifyitems`) to customize framework behavior
- [ ] Service virtualization/mocking for external dependencies: WireMock or equivalent, deciding when to mock vs use real integration environments
- [ ] Treating your framework as an internal product: documentation, versioning, onboarding guides for other engineers
- [ ] Test environment strategy: ephemeral environments, feature-branch environments, shared staging pitfalls

## 5.3 Phase 18 — Contract & Microservices/Distributed Testing
*Dependency: 5.1.3 (basic architecture literacy) + solid API automation (Level 4).*

- [ ] Understanding microservices architecture basics: service boundaries, why services shouldn't share databases, synchronous vs asynchronous communication between services
- [ ] Consumer-Driven Contract Testing with **Pact**: consumer tests, provider verification, Pact Broker
- [ ] Validating APIs against OpenAPI/Swagger specs as an automated CI gate
- [ ] Testing message-queue-based systems: verifying message production/consumption (RabbitMQ/Kafka), testing consumer idempotency, dead-letter-queue behavior
- [ ] Testing eventual consistency: designing polling/waiting strategies for async side effects instead of flaky fixed sleeps
- [ ] Deciding what to test via full integration environments vs contract/mock-based isolation (a key architectural judgment call)

## 5.4 Phase 19 — Performance Testing
*Dependency: Deep functional understanding of the system under test (5.1.3, Level 4 API/UI mastery).*

#### 5.4.1 Performance Testing Theory
- [ ] Types: load testing, stress testing, soak/endurance testing, spike testing, scalability testing
- [ ] Key metrics: response time (p50/p95/p99), throughput (RPS/TPS), error rate, resource utilization
- [ ] Defining performance requirements/SLAs before testing

#### 5.4.2 Tools & Practice
- [ ] **Locust** (Python-native, your natural first tool): writing user behavior classes, distributed load generation, live monitoring UI
- [ ] **k6**: reading/writing basic scripts, CI-friendly execution
- [ ] **JMeter**: fundamentals — still an enterprise standard, know it even as a secondary tool
- [ ] Designing realistic load profiles: ramp-up, steady state, ramp-down
- [ ] Analyzing results and correlating with backend resource metrics to find real bottlenecks
- [ ] Gating CI/CD on performance regressions (failing a build if p95 latency regresses beyond a threshold)

## 5.5 Phase 20 — Security Testing Fundamentals
*Dependency: Phase 18 (architecture literacy) — security testing requires understanding system boundaries.*

- [ ] OWASP Top 10: understanding each vulnerability class and how to test for it (SQL injection, XSS, broken authentication, security misconfiguration, sensitive data exposure, etc.)
- [ ] Automating security checks for authentication/authorization: privilege escalation test matrices (testing every endpoint against every role)
- [ ] API-specific security testing: rate limiting, input validation, mass assignment vulnerabilities, excessive data exposure
- [ ] **OWASP ZAP**: automated baseline scans, integrating into CI
- [ ] Burp Suite basics (manual/semi-automated testing awareness)
- [ ] Dependency vulnerability scanning (`pip-audit`/`safety`, Snyk/Dependabot) and secrets scanning in CI — shift-left supply-chain security
- [ ] Understanding the boundary between SDET-level automated security checks and specialist penetration testing — know what you're responsible for and what to escalate

## 5.6 Phase 21 — Cloud & DevOps Fundamentals for SDETs
*Dependency: Docker basics from Level 4 (Phase 15).*

#### 5.6.1 Containerization Depth
- [ ] Writing Dockerfiles for test runners/environments
- [ ] `docker-compose` for full local test environments (app + DB + dependent services)

#### 5.6.2 Cloud Fundamentals
- [ ] Core AWS services relevant to SDETs: EC2 (running test infrastructure), S3 (storing test artifacts/reports), RDS (test databases)
- [ ] Understanding how CI/CD pipelines deploy to cloud environments, so you know what you're testing against at each pipeline stage
- [ ] Secrets management basics for test credentials (never hardcoded, environment-based or secrets-manager-based)
- [ ] Infrastructure as Code awareness (Terraform basics) — enough to understand ephemeral test-environment provisioning, even if you're not the one writing the IaC

### 5.7 Advanced-Level (SDET Transition) End Expectations Checklist
- [ ] Can pass a real coding round involving data structures/algorithms
- [ ] Has designed a hybrid, multi-suite test framework treated as an internal product
- [ ] Has implemented contract testing (Pact) between at least two services
- [ ] Has designed, executed, and analyzed a real performance test with clear pass/fail criteria
- [ ] Has automated OWASP-aligned security checks integrated into CI
- [ ] Comfortable with Docker and core cloud concepts well enough to reason about test environments end-to-end
- [ ] **This is the point at which you are a fully competent SDET**, distinct from an Automation Tester by your architectural, performance, security, and systems-level depth

---

# 6. LEVEL: EXPERT — SDET Leadership / Architect
*Dependency: Level 5 fully complete, plus real team/production experience for the leadership-heavy modules.*

**End Expectation:** You set quality engineering vision and strategy for a team or organization, architect test infrastructure that scales across teams, drive engineering culture around quality, and stay ahead of emerging practices like AI-assisted testing. Ready for Staff SDET, SDET Architect, or QE Manager/Director roles.

## 6.1 Phase 22 — Test Strategy & Quality Engineering Leadership
- [ ] Writing a formal Test Strategy document for a product/org (scope, approach, tooling, environments, entry/exit criteria, risk framework)
- [ ] Risk-based release planning: deciding and defending what NOT to test
- [ ] Defining and tracking quality metrics: defect density, defect escape rate, coverage (and its real limits as a signal), MTTD/MTTR
- [ ] Shift-left practices: embedding SDETs into design reviews and API contract discussions before code exists
- [ ] Shift-right practices: testing in production safely — canary analysis, feature flags with monitoring, synthetic monitoring
- [ ] Calculating and communicating automation ROI to non-technical stakeholders
- [ ] Establishing team-wide test code standards and review practices

## 6.2 Phase 23 — Distributed Systems Testing & Chaos Engineering
*Dependency: Phase 18 (contract/microservices testing).*

- [ ] Testing multi-region/failover scenarios (simulating region failure, verifying failover)
- [ ] Chaos engineering principles: hypothesis-driven fault injection
- [ ] Tools awareness: Chaos Monkey/Gremlin/Litmus/`pumba`/`toxiproxy`
- [ ] Designing and running a "game day" resilience experiment, documenting findings like an incident report
- [ ] Accessibility (a11y) testing: WCAG fundamentals, automated scanning (`axe-core` with Playwright/Selenium), manual spot-checks

## 6.3 Phase 24 — Building Internal Test Platforms & Tooling
- [ ] Building self-service test reporting dashboards aggregating results across teams/suites
- [ ] Building and distributing custom pytest plugins/CLI tools as internal packages
- [ ] Building shared component libraries (locators/page objects/API clients) reused across multiple teams
- [ ] Automating test environment provisioning (ephemeral environments via IaC)
- [ ] Designing a "golden path" template that lets new teams adopt your testing standards quickly

## 6.4 Phase 25 — AI-Augmented Testing (Emerging — Revisit Often)
- [ ] AI-assisted test case generation from requirements/user stories
- [ ] LLM-assisted test maintenance (auto-suggesting locator fixes when UI changes break tests)
- [ ] Testing AI/LLM-powered product features: non-deterministic output testing strategies, evaluation frameworks (relevance/hallucination checks, tolerance-based golden-answer comparison)
- [ ] Self-healing automation concepts (locator strategies that adapt to minor UI changes)
- [ ] Test impact analysis / dependency-aware test selection (running only tests affected by a given change, to cut CI time at scale)
- [ ] **This is the fastest-moving part of the field** — revisit this module every few months, it will look different a year from now

## 6.5 Phase 26 — Leadership & Influence
- [ ] Mentoring junior/mid automation engineers and manual QA transitioning into automation
- [ ] Running quality retrospectives and driving process improvements from incident postmortems
- [ ] Partnering with engineering leadership on release readiness (go/no-go decisions backed by data, not gut feel)
- [ ] Advocating for org-wide quality ownership — quality as everyone's job, not just the SDET's
- [ ] Writing and presenting technical strategy documents/RFCs to non-QA stakeholders
- [ ] Vendor evaluation and procurement input for test tooling investments (device farms, test management platforms)
- [ ] Cost engineering for test infrastructure — balancing thoroughness against real infrastructure spend

### 6.6 Expert-Level End Expectations Checklist
- [ ] Has authored a formal test strategy guiding a real release or org
- [ ] Has run a structured chaos/resilience experiment and documented it
- [ ] Has built an internal tool or platform component used by more than one team
- [ ] Actively evaluates AI-assisted testing tools with a clear-eyed, non-hype view
- [ ] Is recognized as a quality culture leader, not only a technical expert

---

# 7. Projects & Portfolio

*Every project should be on GitHub with a clear README and, where feasible, a working CI badge. Build in order — earlier projects' output can feed later ones (e.g., use the same target app across levels to show growing depth).*

## 7.1 Beginner Projects (Manual Testing + Python Practice)
*Objective here is demonstrating craft and code fluency, not automation yet.*

#### 7.1.1 Project: Formal Test Plan & Test Case Suite
- [ ] **Objective:** Write a complete test plan, 40+ formal test cases (using design techniques from Phase 1), and 10 sample bug reports for a real public web app (e.g., an open-source demo site)
- [ ] **Tech stack:** Test management doc (Markdown/Notion/TestRail free tier), Jira free tier for bug tracking
- [ ] **Skills demonstrated:** Requirement analysis, test design techniques, professional documentation

#### 7.1.2 Project: Python CLI Utility with Tests
- [ ] **Objective:** Build a small CLI tool (e.g., a to-do manager or file organizer) and write pytest unit tests for it
- [ ] **Tech stack:** Python, `argparse`/`click`, pytest
- [ ] **Skills demonstrated:** Core Python, OOP, pytest fundamentals, SQL if persistence is added via SQLite

## 7.2 Beginner→Intermediate Projects (First Automation)

#### 7.2.1 Project: API Test Automation Suite
- [ ] **Objective:** Automate a public REST API (e.g., a demo e-commerce or bookstore API) covering CRUD, auth, negative cases, and schema validation
- [ ] **Tech stack:** Python, pytest, `requests`, `jsonschema`
- [ ] **Skills demonstrated:** Structured API automation, data-driven testing, negative testing

#### 7.2.2 Project: Page-Object-Model UI Automation Suite
- [ ] **Objective:** Automate core user flows (login, search, form submission, checkout) on a demo site
- [ ] **Tech stack:** Python, Selenium, pytest, POM architecture
- [ ] **Skills demonstrated:** UI automation fundamentals, anti-flakiness practices, refactoring from scripts to framework

#### 7.2.3 Project: CI-Integrated Combined Suite
- [ ] **Objective:** Combine 7.2.1 and 7.2.2 into one repo running in GitHub Actions with HTML reports
- [ ] **Tech stack:** GitHub Actions, `pytest-html`
- [ ] **Skills demonstrated:** Repo structuring, CI/CD basics, professional reporting

## 7.3 Intermediate Projects (Automation Tester Milestone Portfolio)

#### 7.3.1 Project: Multi-Layer Test Framework (UI + API + DB)
- [ ] **Objective:** Rebuild/extend your suite with Playwright, add database verification steps, and add BDD feature files for key scenarios
- [ ] **Tech stack:** Playwright, pytest, `pytest-bdd`, SQLAlchemy Core/`psycopg2`
- [ ] **Skills demonstrated:** Advanced UI automation, DB testing, BDD collaboration-readiness

#### 7.3.2 Project: Mobile Automation Suite
- [ ] **Objective:** Automate core flows of an open-source demo mobile app, run against a cloud device farm
- [ ] **Tech stack:** Appium, Python, BrowserStack/Sauce Labs free tier
- [ ] **Skills demonstrated:** Mobile automation, cloud device farm integration in CI

#### 7.3.3 Project: Dockerized, Parallelized CI Pipeline
- [ ] **Objective:** Containerize your full suite + a test database via `docker-compose`, add parallel execution and flaky-test retry handling in CI
- [ ] **Tech stack:** Docker, `pytest-xdist`, `pytest-rerunfailures`, Allure reporting
- [ ] **Skills demonstrated:** Environment consistency, CI maturity, professional reporting

## 7.4 Advanced Projects (SDET Transition Portfolio)

#### 7.4.1 Project: End-to-End Test Suite for a Real Backend System
- [ ] **Objective:** Build (or use an existing open-source) backend system with microservices-style boundaries, then build full test coverage: API automation, contract tests (Pact) between services, a UI suite, and a performance test
- [ ] **Tech stack:** pytest, Pact, Playwright, Locust, GitHub Actions
- [ ] **Skills demonstrated:** End-to-end SDET-level ownership across an entire system — the strongest single signal for SDET-level hiring

#### 7.4.2 Project: Security-Aware CI Pipeline
- [ ] **Objective:** Add automated OWASP-aligned security checks, dependency scanning, and secrets scanning to any prior project
- [ ] **Tech stack:** OWASP ZAP baseline scan, `pip-audit`, GitHub Actions
- [ ] **Skills demonstrated:** Shift-left security testing integrated into real CI/CD

#### 7.4.3 Project: Chaos/Resilience Experiment
- [ ] **Objective:** Design and run a chaos experiment against a distributed system you built (kill a dependency, inject latency), document findings in an incident-report style
- [ ] **Tech stack:** Docker Compose fault injection (`pumba`/`toxiproxy`)
- [ ] **Skills demonstrated:** Resilience testing, hypothesis-driven experimentation

## 7.5 Expert-Level Projects

#### 7.5.1 Project: Internal Test Framework "Product"
- [ ] **Objective:** Package your framework as an installable internal library with docs, versioning, and a contribution guide, as if onboarding other engineers onto it
- [ ] **Tech stack:** Python packaging (`pyproject.toml`), MkDocs/Sphinx, semantic versioning
- [ ] **Skills demonstrated:** Platform-engineering mindset applied to QE, framework governance

#### 7.5.2 Project: Multi-Suite Release-Readiness Dashboard
- [ ] **Objective:** Build a dashboard aggregating results from API/UI/Mobile/Performance/Security suites into a single go/no-go release signal
- [ ] **Tech stack:** Python backend, Allure/custom reporting ingestion, a simple frontend or Grafana
- [ ] **Skills demonstrated:** Systems thinking across an entire quality org, tooling-as-a-product

#### 7.5.3 Project: AI-Assisted Test Maintenance Tool
- [ ] **Objective:** Build a tool that uses an LLM to suggest fixes for broken locators when a UI test fails, or auto-generate test cases from a user story
- [ ] **Tech stack:** Python, LLM API integration, your existing Playwright framework
- [ ] **Skills demonstrated:** Frontier AI-in-testing skills — a strong differentiator for Staff-level roles

#### 7.5.4 Project: Open Source Contribution
- [ ] **Objective:** Contribute meaningfully to Playwright, pytest, Appium, or a related testing tool's open-source repo
- [ ] **Skills demonstrated:** Deep tooling expertise, large-codebase navigation, community collaboration — the strongest signal for Staff/Architect-level QE roles

---

# 8. Final Priority Checklist (Master Sequence Summary — Dependencies Stated First)

**Read the blockers before the blocks.** These are hard sequencing constraints, not suggestions:
1. Testing theory (Block A) must precede all automation — automation without test-design thinking finds fewer real bugs.
2. Python fundamentals (Block B) must precede any automation tooling (Blocks E onward) — don't learn Selenium syntax while still shaky on Python basics.
3. Git (Block C) must precede any team-style or CI-integrated work (Block H onward).
4. You must write 30-40 unstructured UI test scripts (early Block F) before learning the Page Object Model (later Block F) — the abstraction only clicks once you've felt the pain it solves.
5. CI/CD (Block H) requires Git (Block C) and a working suite (Blocks E-G) — cannot be reordered earlier.
6. Software engineering depth — DS&A, design patterns (Block J) — is deliberately placed *after* you're a competent Automation Tester (Block I), not before; it's the SDET differentiator, not a beginner prerequisite.
7. Performance and Security testing (Blocks L, M) require deep functional understanding of the system under test, which only comes from solid functional automation (Blocks E-I).
8. Contract/microservices testing (Block K) requires basic architecture literacy, picked up in Block J.
9. Leadership and org-wide strategy topics (Blocks P, Q) require real team/production experience — treat them as things to practice on the job, not purely through solo study.

- [ ] **Block A — Testing Foundations:** SDLC/STLC → test design techniques → test case writing → defect lifecycle & bug reporting
- [ ] **Block B — Python Fundamentals:** Core syntax → OOP → intermediate mechanics (generators/decorators/context managers) → best practices
- [ ] **Block C — Git:** Core workflow → branching → PRs → conflict resolution
- [ ] **Block D — Web/HTTP/SQL Fundamentals:** HTTP protocol → DevTools → SQL fundamentals for independent verification
- [ ] **Block D.5 — Professional Skills (start now, continuous):** Communication → Agile ceremonies → developer collaboration → quality mindset
- [ ] **Block E — pytest & API Automation:** pytest fundamentals → `requests`-based API automation → data-driven & schema-validated tests → Postman/Newman
- [ ] **Block F — UI Automation:** DOM/locators → Selenium fundamentals → unstructured scripts first → Page Object Model refactor
- [ ] **Block G — Test Management Tools:** Jira → TestRail/Zephyr/Xray
- [ ] **Block H — CI/CD Basics:** Repo structuring → GitHub Actions → headless execution → basic reporting
- [ ] **Block I — Automation Tester Proficiency (milestone):** Playwright → advanced API framework maturity → BDD → DB testing/test data management → mobile (Appium) → CI/CD maturity (parallelization, flaky handling, Allure, Docker)
- [ ] **Block J — Software Engineering Depth:** DS&A → design patterns in test code → architecture literacy for the systems you test
- [ ] **Block K — Test Architecture & Contract Testing:** Hybrid framework design → shared core libraries → Pact contract testing → async/message-queue testing
- [ ] **Block L — Performance Testing:** Theory & metrics → Locust (primary) → k6/JMeter (secondary) → CI-gated regression checks
- [ ] **Block M — Security Testing:** OWASP Top 10 → automated auth/authz checks → ZAP → dependency/secrets scanning
- [ ] **Block N — Cloud & DevOps for SDETs:** Docker depth → core AWS services → secrets management → IaC awareness
- [ ] **Block O — Distributed Systems & Chaos:** Multi-region/failover testing → chaos engineering → accessibility testing
- [ ] **Block P — Test Strategy & Platform Engineering:** Test strategy documents → quality metrics → shift-left/shift-right → internal tooling/dashboards
- [ ] **Block Q — Leadership & Frontier:** Mentoring → org-wide standards → AI-assisted testing → self-healing automation → test impact analysis

This completes the roadmap end-to-end: Beginner manual/programming foundations → full Automation Tester competency (a real, hireable milestone in its own right) → SDET-level software-engineering, architecture, performance, security, and distributed-systems depth → Expert-level quality engineering leadership.
