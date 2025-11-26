# Agent Instructions for Spec-Driven Development

## 🚨 HIGHEST PRIORITY RULES 🚨

### 1. The "Read-Only" Rule
**NEVER** modify the codebase (src/test files) until **Phase 5 (Implementation)**.
- Phases 1-4 are strictly for documentation and planning within the spec directory (e.g. `.specs/[feature-name]/` or `packages/[package-name]/SPEC/`).
- Premature coding leads to technical debt and architectural misalignment.

### 2. The "Authorization Gate" Protocol
**NEVER** proceed to the next phase without explicit user approval.
- **Stop** after completing a document.
- **Commit** all phase artifacts to git before requesting approval.
- **Present** the content to the user.
- **Wait** for "Proceed" or "Approved".
- **Commit** any refinements before moving to the next phase.

### 3. The "Single Source of Truth"
The spec directory (e.g. `.specs/[feature-name]/` or `packages/[package-name]/SPEC/`) is the source of truth.
- If the code contradicts the spec, the code is wrong (or the spec needs updating first).
- Do not rely on conversation memory; rely on the written documents.

### 4. The "Evidence-Based" Protocol
**NEVER** conclude a task without experimental evidence.
- All conclusions must be based on evidence that can be reliably reproduced by peer reviewers.
- Do not simply state "it works" or "task complete." You must provide the test output, CLI logs, or verification results that prove the conclusion.

---

## 📋 The 5-Phase Workflow

### Phase 1: Instructions (`instructions.md`)
**Objective:** Capture the raw intent, context, and high-level goals.

**✅ CONTENT:**
- **Context:** Why are we doing this? What is the current state?
- **User Story:** As a [role], I want [feature], so that [benefit].
- **High-Level Goals:** Bullet points of desired outcomes.
- **Out of Scope:** Explicitly state what we are NOT doing.

**🛑 FORBIDDEN IN THIS PHASE:**
- **Technical Jargon:** Avoid specific function names or file paths unless they are part of the problem description.
- **Implementation Details:** Do not discuss *how* to build it.
- **Atomic Requirements:** Do not write "The system shall..." statements yet.

---

### Phase 2: Requirements (`requirements.md`)
**Objective:** Translate intent into atomic, testable, and unambiguous statements using **EARS Notation**.

**✅ CONTENT:**
- **Functional Requirements (FR):** What the system does.
- **Non-Functional Requirements (NFR):** Performance, security, reliability.
- **Constraints:** Tech stack limitations, legacy support.

**📝 EARS NOTATION (Mandatory for FRs):**
Use the **Easy Approach to Requirements Syntax** patterns. Format for readability - single line or multi-line are both fine:
1.  **Ubiquitous (Always):** `The <System> shall <Response>`
    *   *Ex: The Logger shall write all events to stdout.*
2.  **Event-Driven (When):** `When <Trigger>, the <System> shall <Response>`
    *   *Ex: When the user clicks Save, the System shall validate the input.*
    *   *Also fine:* **When** the user clicks Save  
        **Then** the System shall validate the input
3.  **State-Driven (While):** `While <State>, the <System> shall <Response>`
    *   *Ex: While the connection is lost, the Client shall queue outgoing requests.*
4.  **Unwanted Behavior (If):** `If <Trigger>, the <System> shall <Response>`
    *   *Ex: If the API returns a 500 error, the System shall retry twice.*
5.  **Optional Feature (Where):** `Where <Feature is included>, the <System> shall <Response>`
    *   *Ex: Where the Pro license is active, the System shall enable export.*

**🛑 FORBIDDEN IN THIS PHASE:**
- **Ambiguity:** Words like "fast", "easy", "user-friendly", "robust" (Use metrics instead: "under 200ms").
- **Implementation Specifics:** Do not dictate *which* library or algorithm to use (that is Design).
- **Pseudo-code:** No code blocks.

---

### Phase 3: Design (`design.md`)
**Objective:** Define the technical architecture and implementation strategy.

**✅ CONTENT:**
- **Data Models:** Type names and their fields (not full TypeScript syntax)
- **API Signatures:** Function names, inputs, outputs as prose or tables
- **Module Architecture:** File/folder structure, dependency relationships
- **Algorithms:** Plain English or numbered steps for complex logic
- **Error Handling Strategy:** Error categories and recovery approaches
- **Test Strategy:** What to test and how (unit vs integration)

**🛑 FORBIDDEN IN THIS PHASE:**
- **Code blocks:** No TypeScript, JavaScript, JSON, or any executable syntax
- **Full implementations:** Describe WHAT functions do, not HOW (no function bodies)
- **Copy-pasteable configs:** Describe package.json structure, don't write it out
- **Test implementations:** Describe test cases in prose, don't write test code
- **Vague Hand-waving:** Do not say "We will handle errors." Define *exactly* how.
- **Scope Creep:** Do not add features not listed in `requirements.md`.

**💡 RULE OF THUMB:**
If it could be copy-pasted into a `.ts`, `.js`, or `.json` file and executed, it does NOT belong in design.md. Use prose, tables, bullet points, and diagrams instead.

---

### Phase 4: Plan (`plan.md`)
**Objective:** Create a step-by-step execution checklist using **Red-Green-Refactor TDD**.

**✅ CONTENT:**
- **Phased Execution:** Break work into logical chunks (e.g., "Setup", "Core Logic", "API Layer").
- **Atomic Tasks:** Each task should be a single commit or PR.
- **Verification Steps:** For each task, define how to verify it (e.g., "Run `npm test`", "Check linter").
- **Dependency Order:** Ensure Task B implies Task A is done.

**🔴🟢🔵 TDD STRUCTURE (Mandatory):**
For each module/feature, structure tasks as:
1. **RED:** Write failing tests first, with minimal stub implementation that compiles but fails tests
2. **GREEN:** Implement just enough code to make tests pass
3. **REFACTOR:** Clean up if needed (optional step, only if code is messy)

Example task structure:
- B1. Write Slug.test.ts (RED) — tests fail
- B2. Implement Slug.ts (GREEN) — tests pass

**🛑 FORBIDDEN IN THIS PHASE:**
- **Time Estimates:** Do not estimate hours or days. Focus strictly on logical dependency and atomicity.
- **Design Decisions:** If you are deciding *how* to do something here, go back to Phase 3.
- **New Requirements:** If you find a missing requirement, go back to Phase 2.
- **Implementation before tests:** Never write implementation code before the corresponding test exists.

---

### Phase 5: Implementation (Coding)
**Objective:** Write code that satisfies the Design and passes the Requirements.

**✅ CONTENT:**
- **Code:** Writing source files.
- **Tests:** Writing and running tests.
- **Docs:** Updating JSDoc/Comments/README.

**🚨 MANDATORY LOOP:**
For every task in `plan.md`:
1.  **Write Code** (matching `design.md`).
2.  **Lint/Format** (Standard project linter).
3.  **Compile/Check Types** (if applicable).
4.  **Write/Run Tests** (Produce the experimental evidence).
5.  **Commit**.

**🛑 FORBIDDEN IN THIS PHASE:**
- **Deviating from Design:** If the design proves impossible, **STOP**. Update `design.md` first, get approval, then continue.
- **Skipping Verification:** Never tick a box in `plan.md` without running the verification step and showing the evidence.
- **Leaving Broken Builds:** The codebase must compile and pass tests at the end of every step.

---

## 🛠️ General Repository Rules

1.  **Linting:** Immediately run the project's linter/formatter after editing any file.
2.  **Testing:** New features require new tests. Bug fixes require regression tests.
3.  **Types:** If the language is typed (e.g., TypeScript, Go, Rust), strict type safety is required. No `any` or equivalent bypasses unless absolutely necessary and documented.
4.  **Comments:** Code should be self-documenting. Use comments to explain *why*, not *what*.
