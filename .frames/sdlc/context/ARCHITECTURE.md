# Project-level architecture docs

Project-level architecture docs are located at: `.frames/sdlc/architecture/*.md`.

# Software Architecture — General Reference

## What Architecture Actually Is

Architecture is the set of decisions that are expensive to change later. Not impossible — expensive. The goal is to make the right things easy to change and the wrong things hard to do by accident.

A good architecture:
- Makes the system's data flow obvious to someone reading it for the first time.
- Draws clear boundaries between components so they can change independently.
- Names its assumptions explicitly, so when one breaks, you know where to look.
- Defers decisions that don't need to be made yet — and locks in decisions that do.

A bad architecture feels fine for the first three months. Then everything takes twice as long as it should, and nobody can explain why.

### The Cost Spectrum

Some decisions are cheap to reverse: a variable name, a utility function's implementation, a CSS class. Some are expensive: a database schema, a public API contract, a state management pattern. Architecture is primarily concerned with the expensive end of this spectrum.

Before making a decision, ask: *if this turns out to be wrong in three months, what does it cost to fix?* If the answer is "an afternoon," it's not an architecture decision. If the answer is "we have to migrate data and change twelve call sites," it is.

---

## Backend Fundamentals

### Responsibility Separation

Every backend component should have a one-sentence description of what it does. If you need two sentences, the component is doing too much.

Common layers, from outside in:
- **Transport layer** — receives requests (HTTP, WebSocket, message queue). Handles serialization, authentication, rate limiting. Does not contain business logic.
- **Service layer** — orchestrates business logic. Calls domain objects, coordinates between them. Does not know about HTTP status codes or WebSocket frames.
- **Domain layer** — the actual rules of your system. Pure logic. No I/O. Testable without mocking anything.
- **Data access layer** — reads and writes persistent state. The only layer that knows what your database looks like.

The iron rule: dependencies point inward. The transport layer knows about the service layer. The service layer knows about the domain layer. Never the reverse. The domain layer does not import from the transport layer. If it does, the boundary is broken.

### State Management

Backend state lives in one of three places:
1. **In memory** — fast, lost on restart. Use for caches, computed values, session-scoped data.
2. **In a database** — durable, queryable. Use for anything that must survive a restart.
3. **In a file** — durable, not queryable. Use for config, logs, static assets.

The most common architectural mistake in backend systems is putting state in the wrong place. If something is in memory but should be in a database, you'll lose it. If something is in a database but should be computed, you'll fight staleness forever.

**Rule of thumb:** if two different processes need to agree on a value, that value belongs in a shared store with a clear write protocol — not in both processes' memory.

### Concurrency

Concurrency is not parallelism. Concurrency is about *structure* — handling multiple things in progress at once. Parallelism is about *execution* — doing multiple things at the same physical instant.

Key models:
- **Threads** — OS-managed. Share memory. Easy to write, hard to debug. Race conditions are the classic failure mode.
- **Async/await** — single-threaded concurrency. One thing runs at a time, but I/O waits don't block other work. Simpler mental model than threads, but you must never block the event loop.
- **Processes** — OS-managed. Isolated memory. Communicate via IPC (pipes, sockets, shared memory). Heaviest option, but no shared-state bugs.
- **Actor model** — each actor has private state and communicates via messages. No shared memory. Scales well. More complex to reason about ordering.

Pick the simplest model that handles your actual concurrency needs. Most web applications need async/await and nothing else.

### Error Handling

Errors are data. They have types, they carry context, and they flow through the system. A good error handling strategy answers three questions:

1. **Who sees this error?** Some errors are for developers (stack traces, internal state). Some are for users (validation failures, permission denials). Never show one audience the other's errors.
2. **What should happen next?** Some errors are retryable (network timeout). Some are permanent (invalid input). The system should know the difference.
3. **Where is it handled?** Catch errors at the layer that knows what to do about them. If a layer doesn't know what to do, let the error propagate upward. The worst pattern is catching an error, logging it, and continuing as if nothing happened.

**Never swallow errors silently.** An error that is caught and ignored is worse than an error that crashes the process — at least the crash tells you something is wrong.

---

## Frontend Fundamentals

### The Frontend's Job

The frontend has three responsibilities:
1. **Present state** — show the user what the system knows.
2. **Capture intent** — let the user express what they want to do.
3. **Provide feedback** — confirm that the system received and acted on their intent.

Everything else — business logic, validation, authorization — belongs on the backend. The frontend may *duplicate* some of this (client-side validation for UX), but the backend is always the authority.

### Component Architecture

Modern frontends are built from components. A component is a self-contained unit of UI: it owns its markup, its styles, and its local behavior.

Good component boundaries follow these principles:
- **Single responsibility.** A component does one thing. A `UserAvatar` renders an avatar. It does not also fetch user data.
- **Props down, events up.** Parent components pass data to children via props. Children communicate back via events (callbacks). Data flows in one direction.
- **Stateless where possible.** A component that derives everything from its props is easier to test, easier to reason about, and easier to reuse. Reserve local state for genuinely local concerns (is this dropdown open?).

### State Management

Frontend state falls into categories:
- **Server state** — data that lives on the backend and is cached locally. Use a data-fetching library (React Query, SWR, Apollo). Do not put this in global state manually.
- **UI state** — ephemeral, view-specific. Is this modal open? Which tab is selected? Local component state or a lightweight store.
- **Application state** — shared across multiple components but not from the server. Current user session, feature flags, theme. Global store (Redux, Zustand, Context).

The most common frontend architecture mistake is putting everything in one global store. Server state and UI state have completely different lifecycles and access patterns. Treating them the same creates unnecessary complexity.

### Rendering and Performance

The browser renders in a pipeline: HTML → DOM → Layout → Paint → Composite. Every change to the DOM potentially triggers parts of this pipeline.

Key concepts:
- **Virtual DOM** (React, Vue) — a lightweight copy of the DOM. Changes are diffed against it, and only the minimal set of real DOM mutations is applied.
- **Reactivity** (Svelte, Vue, Solid) — the framework tracks which state each piece of UI depends on and updates only that piece when the state changes.
- **Hydration** — server-rendered HTML is "activated" on the client by attaching event handlers and state. The page is visible before JavaScript finishes loading.

**Performance rule:** measure before optimizing. The browser is fast. Most performance problems come from doing too much work on every render (recomputing expensive values, re-rendering large lists), not from the framework being slow.

---

## APIs — The Boundary Layer

### What an API Contract Is

An API contract is an agreement between two systems: "I will send you data shaped like X, and you will respond with data shaped like Y." The contract is the *interface* — the shape, not the implementation.

Good API contracts are:
- **Explicit.** Every field has a type and a description. Nullable fields are marked nullable. Optional fields are marked optional. Nothing is implied.
- **Versioned.** When the contract changes, the version changes. Old clients continue to work against the old version.
- **Validated.** Both sides validate the data they receive. The sender validates before sending (catch bugs early). The receiver validates on receipt (don't trust the network).

### REST

REST is not a protocol — it's a set of conventions for using HTTP to interact with resources.

Core principles:
- **Resources, not actions.** `/users/123` is a resource. `/getUser?id=123` is an RPC call wearing a REST costume.
- **HTTP methods carry meaning.** GET reads. POST creates. PUT replaces. PATCH updates partially. DELETE removes. Respect these — GET requests must never have side effects.
- **Status codes carry meaning.** 200 = success. 201 = created. 400 = your fault. 404 = not found. 500 = our fault. Don't return 200 with `{"error": "something broke"}`.
- **Stateless.** Each request carries everything the server needs to process it. No server-side session state between requests (authentication tokens are carried per-request).

### WebSockets

WebSockets provide a persistent, bidirectional connection between client and server. Use them when:
- The server needs to push data to the client without being asked (real-time updates, live feeds).
- The communication is frequent and low-latency (the overhead of HTTP request/response per message is too high).

Do *not* use them when:
- The client asks a question and waits for an answer (that's what HTTP is for).
- Updates are infrequent (polling or server-sent events are simpler).

WebSocket architecture concerns:
- **Connection lifecycle.** Connections drop. The client must reconnect automatically. The server must handle reconnection gracefully (replay missed messages, or let the client re-sync).
- **Message format.** Define a schema for every message type. Use a discriminated union pattern: every message has a `type` field that tells the receiver what shape the rest of the payload is.
- **Backpressure.** If the server produces messages faster than the client can consume them, what happens? Buffer? Drop? Slow down? Decide this up front.

### GraphQL

GraphQL lets the client specify exactly which fields it needs. The server provides a schema; the client writes queries against it.

Strengths: eliminates over-fetching, strongly typed, self-documenting.
Weaknesses: caching is harder (no URL-based cache keys), authorization is more complex (field-level access control), N+1 query problems require explicit solutions (DataLoader pattern).

Use GraphQL when the frontend has diverse data needs that would require many REST endpoints. Use REST when the data access patterns are predictable and well-defined.

### Schema Validation

The boundary between two systems is where bugs live. Both sides should validate the data crossing that boundary:

- **Backend:** Use a schema validation library (Pydantic in Python, Zod in TypeScript, JSON Schema generally). Define the shape once. Generate validation automatically.
- **Frontend:** Validate API responses against a schema. Don't assume the server sent what you expected — especially after deployments, where frontend and backend versions may be temporarily mismatched.
- **Single source of truth:** Ideally, the schema is defined in one place and both sides derive from it. If it's defined in two places, they will diverge. It's a matter of when, not if.

---

## Data — Storage, Shape, and Flow

### Data Modeling

A data model defines what entities exist, what fields they have, and how they relate to each other. It is the skeleton of the system. Get it wrong and everything built on top shifts.

Principles:
- **Normalize until it hurts, then denormalize until it works.** Normalization eliminates redundancy. Denormalization improves read performance. The right balance depends on your read/write ratio.
- **Every field has a reason.** If you can't explain why a field exists and what would break without it, remove it.
- **Types are documentation.** A field typed `string` tells you nothing. A field typed `EmailAddress` tells you everything. Use domain-specific types wherever possible.
- **Precision matters.** Money is not a float. Timestamps need time zones. Percentages need a denominator. Define the precision model for your domain up front — retrofitting it is expensive.

### Relational Databases

Relational databases (PostgreSQL, MySQL, SQLite) store data in tables with typed columns and enforce relationships via foreign keys.

When to use: structured data with complex query patterns, strong consistency requirements, transactions that span multiple records.

Key concepts:
- **Indexes** speed up reads at the cost of slower writes. Index the columns you query by. Don't index everything.
- **Transactions** ensure that a group of operations either all succeed or all fail (ACID). Use them whenever multiple writes must be consistent.
- **Migrations** are versioned changes to the database schema. They run in order. They are not reversible in production without data loss — test them thoroughly.
- **Connection pooling** reuses database connections instead of opening a new one per request. Essential for any production system.

### Document Databases

Document databases (MongoDB, DynamoDB, Firestore) store data as JSON-like documents. No fixed schema per collection.

When to use: data with variable shape, high write throughput, simple query patterns (key-value or single-collection lookups).

When *not* to use: data with complex relationships between entities, queries that need to join across collections, strong consistency requirements across multiple documents.

### Caching

A cache stores computed or fetched results so they don't need to be recomputed or re-fetched. Every cache introduces a staleness problem: the cache may not reflect the current state of the underlying data.

Cache invalidation strategies:
- **TTL (time-to-live)** — the cache entry expires after a fixed duration. Simple. Works when staleness is tolerable.
- **Write-through** — every write updates both the database and the cache. Consistent. Slower writes.
- **Write-behind** — writes go to the cache first, then asynchronously to the database. Fast writes. Risk of data loss if the cache crashes.
- **Event-driven invalidation** — a change event triggers cache eviction. Most precise. Requires an event system.

**Rule:** if you cache something, document when and how it gets invalidated. A cache without a documented invalidation strategy is a bug waiting to happen.

### Data Flow

Data moves through a system. Understanding *how* it moves is as important as understanding where it lives.

Common patterns:
- **Request/response** — client asks, server answers. Synchronous. Simple. Doesn't scale to fan-out.
- **Publish/subscribe** — a producer publishes events to a topic. Zero or more consumers receive them. Decoupled. Good for notifications and cascading updates.
- **Event sourcing** — instead of storing current state, store the sequence of events that produced it. Current state is derived by replaying events. Powerful for audit trails and temporal queries. Complex to implement correctly.
- **CQRS (Command Query Responsibility Segregation)** — separate the write model (optimized for consistency) from the read model (optimized for query performance). Useful when read and write patterns are very different.

---

## Networking Essentials

### The Request Lifecycle

When a client makes an HTTP request, it traverses:

1. **DNS resolution** — the domain name is resolved to an IP address. Cached at multiple levels (browser, OS, ISP).
2. **TCP connection** — a three-way handshake establishes the connection. For HTTPS, a TLS handshake follows.
3. **Request transmission** — the HTTP request (method, headers, body) is sent.
4. **Server processing** — the server receives, processes, and generates a response.
5. **Response transmission** — the HTTP response (status, headers, body) is sent back.
6. **Connection reuse or close** — HTTP/1.1 keep-alive or HTTP/2 multiplexing allows reuse.

Every step can fail or be slow. Timeouts should be set at each stage, not just on the overall request.

### HTTP/2 and HTTP/3

- **HTTP/1.1** — one request per connection at a time (head-of-line blocking). Browsers open multiple connections to work around this.
- **HTTP/2** — multiplexes multiple requests over a single connection. Binary framing. Header compression. Server push. Eliminates most head-of-line blocking at the application layer.
- **HTTP/3** — uses QUIC (UDP-based) instead of TCP. Eliminates head-of-line blocking at the transport layer. Faster connection establishment.

For most applications, HTTP/2 is the sweet spot. HTTP/3 matters for latency-sensitive applications or unreliable networks.

### DNS

DNS maps domain names to IP addresses. Records you should know:
- **A / AAAA** — maps a domain to an IPv4 / IPv6 address.
- **CNAME** — maps a domain to another domain (alias).
- **MX** — mail server for a domain.
- **TXT** — arbitrary text. Used for verification (SPF, DKIM, domain ownership).
- **NS** — authoritative nameserver for a domain.

DNS propagation is not instant. TTL values control how long records are cached. When changing DNS, lower the TTL *before* the change, then raise it after.

### Load Balancing

A load balancer distributes incoming requests across multiple backend instances.

Strategies:
- **Round-robin** — requests go to each server in turn. Simple. Doesn't account for server load.
- **Least connections** — requests go to the server with the fewest active connections. Better for uneven request durations.
- **IP hash** — requests from the same IP always go to the same server. Useful for session affinity. Bad for uneven client distribution.
- **Weighted** — servers are assigned weights proportional to their capacity.

Layer 4 (TCP) load balancers are faster but can't inspect HTTP headers. Layer 7 (HTTP) load balancers can route based on path, headers, or cookies — more flexible, slightly higher latency.

### CORS

Cross-Origin Resource Sharing controls which domains can make requests to your API from a browser. The browser enforces it, not the server — but the server configures it.

Key headers:
- `Access-Control-Allow-Origin` — which origins can access the resource.
- `Access-Control-Allow-Methods` — which HTTP methods are allowed.
- `Access-Control-Allow-Headers` — which request headers are allowed.
- `Access-Control-Allow-Credentials` — whether cookies are sent with cross-origin requests.

Preflight requests (OPTIONS) are sent automatically by the browser for non-simple requests. Your server must handle them. If CORS is misconfigured, the browser silently blocks the response — the request succeeds on the server side, but the client never sees the data.

---

## Infrastructure and Deployment

### Environments

A typical deployment pipeline has at least three environments:
- **Development** — local machines. Fast iteration. Tolerates instability.
- **Staging** — mirrors production as closely as possible. Used for final testing before release.
- **Production** — the real thing. Stability is paramount.

The rule: staging should match production in every way that matters — same OS, same database engine, same network topology. Differences between staging and production are bugs that only manifest in production.

### Containers

A container packages an application with its dependencies into an isolated, reproducible unit. Docker is the dominant runtime.

Key concepts:
- **Image** — a read-only template. Built from a Dockerfile. Layered (each instruction creates a layer; layers are cached).
- **Container** — a running instance of an image. Isolated filesystem, network, and process space.
- **Registry** — stores and distributes images. Docker Hub, ECR, GCR, GHCR.
- **Multi-stage builds** — use one image to build the application and a smaller image to run it. Reduces final image size significantly.

Container best practices:
- One process per container. Don't run your app and your database in the same container.
- Use specific image tags, not `latest`. `latest` is a moving target.
- Don't run as root inside the container.
- Keep images small. Alpine-based images are a good default. Distroless images are even smaller.

### Orchestration

Container orchestration manages the lifecycle of containers across a cluster of machines.

**Kubernetes** is the dominant orchestrator. Core concepts:
- **Pod** — the smallest deployable unit. One or more containers that share network and storage.
- **Service** — a stable network endpoint for a set of pods. Load-balances across them.
- **Deployment** — declares the desired state (which image, how many replicas). The controller makes reality match.
- **ConfigMap / Secret** — externalized configuration. ConfigMaps for non-sensitive data, Secrets for credentials.
- **Ingress** — routes external HTTP traffic to internal services.

Kubernetes is powerful and complex. For many applications, simpler alternatives suffice: Docker Compose for development, ECS or Cloud Run for production, or even a single VM with a process manager.

### CI/CD

Continuous Integration / Continuous Deployment automates the path from code change to production.

- **CI (Continuous Integration)** — every commit triggers automated builds and tests. The main branch is always in a deployable state.
- **CD (Continuous Deployment)** — every passing build is automatically deployed to production. Requires high test confidence.
- **CD (Continuous Delivery)** — every passing build *can* be deployed to production, but a human triggers the release. Less risky.

Pipeline stages (typical):
1. **Lint** — static analysis and style checks.
2. **Build** — compile, bundle, resolve dependencies.
3. **Test** — unit tests, integration tests. Fast tests first (fail early).
4. **Security scan** — dependency vulnerabilities, secrets detection.
5. **Deploy to staging** — automated.
6. **Deploy to production** — automated or manual gate.

**Pipeline discipline:** a red pipeline is a team-wide emergency, not a personal task. If the build is broken, fixing it takes priority over new features.

### Deployment Strategies

- **Rolling update** — new version is deployed incrementally. Old instances are replaced one at a time. Zero downtime. Rollback by deploying the old version.
- **Blue-green** — two identical environments. Traffic switches from blue (old) to green (new) atomically. Instant rollback by switching back. Requires double the infrastructure during deployment.
- **Canary** — new version receives a small percentage of traffic. Monitor for errors. Gradually increase. Rollback by routing all traffic back to the old version.
- **Feature flags** — new code is deployed but disabled. Enabled per-user, per-percentage, or per-environment. Decouples deployment from release.

---

## Infrastructure as Code

### The Principle

Infrastructure as Code (IaC) means defining your infrastructure in version-controlled configuration files rather than clicking through a web console. The configuration is the source of truth. If the console and the code disagree, the code wins.

Benefits:
- **Reproducibility.** The same config produces the same infrastructure every time.
- **Auditability.** Changes are tracked in version control. You can see who changed what and when.
- **Review.** Infrastructure changes go through the same code review process as application changes.
- **Disaster recovery.** If the infrastructure is destroyed, re-run the config. Everything comes back.

### Declarative vs. Imperative

- **Declarative** (Terraform, CloudFormation, Pulumi) — you describe the desired end state. The tool figures out how to get there. Idempotent: running it twice produces the same result.
- **Imperative** (shell scripts, AWS CLI commands) — you describe the steps to execute. Order matters. Not idempotent by default. Harder to reason about the current state.

Prefer declarative for infrastructure. Use imperative for one-off tasks and migrations.

### Terraform Basics

Terraform is the most widely used IaC tool. It is provider-agnostic (AWS, GCP, Azure, Cloudflare, etc.).

Core concepts:
- **Provider** — a plugin that knows how to manage a specific platform's resources.
- **Resource** — a single piece of infrastructure (a VM, a database, a DNS record).
- **State** — a file that maps your config to real-world resources. Stored remotely (S3, GCS) for team use. Never edit by hand.
- **Plan** — a preview of what Terraform will do. Always review a plan before applying.
- **Module** — a reusable group of resources. Used to encapsulate patterns (e.g., "a VPC with these subnets and security groups").

**State is sacred.** If state gets out of sync with reality (someone changed infrastructure manually), Terraform will try to "fix" it — potentially destroying resources. Treat the state file with the same care as a production database.

### Configuration Management

IaC provisions infrastructure. Configuration management configures what runs on it.

- **Ansible** — agentless. Connects via SSH. Playbooks define tasks. Good for configuring servers, deploying applications, running ad-hoc commands.
- **Chef / Puppet** — agent-based. More complex. Better for large, long-lived fleets that need continuous enforcement.
- **Cloud-init** — runs on first boot of a cloud instance. Good for initial setup. Not for ongoing management.

For containerized applications, configuration management is largely replaced by building the configuration into the container image. Configuration management matters most when you're managing VMs or bare metal.

---

## Observability

### The Three Pillars

Observability answers the question: *what is my system doing right now, and why?*

1. **Logs** — discrete events. "User 123 logged in at 14:32." Structured logs (JSON) are searchable and parseable. Unstructured logs (plain text) are not. Use structured logging from day one.
2. **Metrics** — numeric measurements over time. Request rate, error rate, latency percentiles, CPU usage. Aggregated. Good for dashboards and alerts.
3. **Traces** — the path of a single request through the system. Which services did it touch? How long did each step take? Where did it slow down? Essential for debugging distributed systems.

### Logging Best Practices

- **Structured.** JSON, not free-form strings. Every log entry should have at minimum: timestamp, level, message, and a correlation ID.
- **Leveled.** DEBUG for development detail. INFO for normal operations. WARN for recoverable problems. ERROR for failures that need attention. FATAL for process-ending failures.
- **Contextual.** Include the request ID, user ID, and relevant entity IDs. A log entry without context is forensically useless.
- **Not excessive.** Don't log every successful health check. Don't log request bodies in production (PII risk). Do log state transitions, errors, and decisions.

### Alerting

Alerts notify humans when something needs attention. The goal is signal, not noise.

- **Alert on symptoms, not causes.** Alert on "error rate > 5%" not "database CPU > 80%." The database might handle 90% CPU fine. The users definitely notice a 5% error rate.
- **Every alert needs a runbook.** If the person who receives the alert doesn't know what to do, the alert is useless. Attach a link to a document that explains: what this alert means, what to check first, and how to mitigate.
- **If an alert fires and nobody acts on it, delete it.** Alert fatigue is real. An ignored alert is worse than no alert — it trains the team to ignore alerts.

---

## Security Fundamentals

### Authentication and Authorization

- **Authentication** — who are you? Typically: username/password, OAuth, API keys, JWTs.
- **Authorization** — what are you allowed to do? Typically: roles, permissions, policies.

These are separate concerns. A system can authenticate you (confirm your identity) without authorizing you (granting access to a specific resource). Keep them in separate layers.

**JWTs (JSON Web Tokens):** A signed token containing claims (user ID, roles, expiration). The server doesn't need to look up session state — the token *is* the session. Tradeoff: you can't revoke a JWT before it expires without maintaining a blacklist (which reintroduces server-side state).

**OAuth 2.0:** A delegation protocol. The user authorizes a third-party application to access their data on another service. The user's credentials are never shared with the third party. Used for "Sign in with Google/GitHub" flows.

### Common Vulnerabilities

- **SQL Injection** — user input is interpolated directly into a SQL query. Prevention: parameterized queries. Always. No exceptions.
- **XSS (Cross-Site Scripting)** — user input is rendered as HTML/JavaScript in another user's browser. Prevention: escape all user-generated content. Use a framework that escapes by default (React does).
- **CSRF (Cross-Site Request Forgery)** — a malicious site triggers a request to your site using the user's cookies. Prevention: CSRF tokens, SameSite cookies.
- **Secret exposure** — credentials committed to version control, logged to stdout, or returned in API responses. Prevention: environment variables for secrets, secret scanning in CI, never log sensitive values.

### HTTPS

HTTPS = HTTP + TLS. TLS encrypts the connection between client and server. Without it, anyone on the network can read and modify the traffic.

There is no good reason to serve anything over plain HTTP in production. TLS certificates are free (Let's Encrypt). The performance overhead is negligible. Use HTTPS everywhere.

### Principle of Least Privilege

Every component should have the minimum permissions required to do its job. The web server doesn't need write access to the database. The background worker doesn't need access to user credentials. The frontend doesn't need admin API endpoints.

This applies at every level: file permissions, database roles, API scopes, IAM policies, network rules. When a component is compromised, least privilege limits the blast radius.

---

## Architectural Patterns

### Monolith

Everything in one deployable unit. One codebase, one process, one database.

Strengths: simple to develop, test, deploy, and debug. One thing to monitor. No network calls between components.
Weaknesses: scales as a unit (can't scale just the hot path). Deployment risk increases with size. Team autonomy is limited.

**Start here.** A well-structured monolith with clear internal boundaries can be decomposed into services later if needed. A premature microservice architecture cannot be easily reassembled into a monolith.

### Microservices

Each service owns a specific domain, has its own database, and communicates via APIs or messages.

Strengths: independent deployment, independent scaling, team autonomy, technology flexibility.
Weaknesses: distributed systems are hard. Network calls fail. Data consistency across services requires careful design. Debugging requires tracing. Operational overhead is high.

**Earn the right to microservices.** The organizational complexity they introduce is only justified when the monolith's constraints are actually blocking you — not when they theoretically might someday.

### Event-Driven Architecture

Components communicate by producing and consuming events rather than calling each other directly.

Strengths: loose coupling (producer doesn't know who consumes), natural audit trail, supports complex workflows.
Weaknesses: harder to trace execution flow, eventual consistency (not all consumers have processed the event yet), ordering guarantees vary by system.

**Event types:**
- **Domain events** — something happened in the business domain. "OrderPlaced," "UserRegistered." Named in past tense.
- **Integration events** — cross-service communication. Carry enough data for the consumer to act without calling back.
- **Commands** — directed at a specific handler. "ProcessPayment," "SendEmail." Named in imperative.

### Layered Architecture

The system is divided into horizontal layers, each with a specific responsibility. Requests flow top-to-bottom; responses flow bottom-to-top.

Classic layers: Presentation → Business Logic → Data Access → Database.

Strengths: simple mental model, clear separation of concerns, widely understood.
Weaknesses: changes often span all layers (adding a field requires changes from UI to database). Can lead to "pass-through" layers that add no value.

### Hexagonal Architecture (Ports and Adapters)

The domain logic sits at the center. It defines *ports* — interfaces that describe what it needs from the outside world (a database, an email sender, an API). *Adapters* implement those interfaces for specific technologies.

The domain never depends on infrastructure. Infrastructure depends on the domain.

Strengths: domain logic is pure and testable, infrastructure is swappable, clear boundaries.
Weaknesses: more boilerplate (every external dependency needs a port and adapter), overkill for simple CRUD.

---

## Common Failure Modes

These are the architectural mistakes that don't show up until they're expensive.

### Distributed Monolith

You have microservices, but they all depend on each other synchronously. Deploying one requires deploying all of them. You have the complexity of microservices with the coupling of a monolith. This is worse than either option alone.

**Symptom:** you can't deploy Service A without also deploying Service B.

### Shared Database

Two services read and write the same database tables. They are now coupled at the data layer. Schema changes in one service break the other. You cannot independently evolve either service's data model.

**Rule:** if two services share a database, they are one service pretending to be two.

### Premature Abstraction

You build a generic, configurable system to handle cases that don't exist yet. The abstraction is wrong because you didn't have the concrete examples to inform it. Now every feature must route through a framework that doesn't fit.

**Prefer duplication over the wrong abstraction.** Wait until you have three concrete cases before extracting a pattern. Two cases look similar but might not be.

### Missing Backpressure

A producer generates work faster than a consumer can process it. Without backpressure, the queue grows unbounded, memory is exhausted, and the system crashes.

Every queue needs a strategy: bounded size with rejection, bounded size with oldest-eviction, or flow control that slows the producer.

### Implicit Coupling

Two components depend on each other, but the dependency isn't expressed in the code — it's in a naming convention, a timing assumption, a shared file format, or an undocumented behavior. When one changes, the other breaks, and no one knows why.

**Make coupling explicit.** If A depends on B, there should be an import, a type reference, or a documented contract that says so. Hidden coupling is the most expensive kind of technical debt because you can't see it until it breaks.

### Configuration Drift

The staging environment and production environment have different configurations, but nobody knows which differences are intentional and which are accidental. A deploy works in staging and fails in production.

**Fix:** infrastructure as code, environment parity, and a documented list of intentional differences.

---

*This document covers general software architecture principles. It is not specific to any project or product.*
