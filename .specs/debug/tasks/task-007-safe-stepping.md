# Task 007: Safe Stepping and Blackboxing Implementation

**Status**: Ready to Start  
**Priority**: High  
**Depends On**: CDP implementation (basic connection/command/subscribe working)  
**Research**: `.specs/debug/research-safe-stepping.md`  
**Demo**: `packages-native/debug/test-fixtures/debug-step-through.ts` (working)

## Objective

Implement safe stepping mechanisms for the `@effect-native/debug` service that prevent crashes when stepping through JavaScript code, avoid descending into third-party runtime internals, and provide clean exits from stepping sessions. Enable developers to step through their own code using `stepInto` without triggering V8 inspector crashes or getting lost in node_modules/runtime code.

## User Story

As a developer using the Effect Native debug service to step through my code, I want the debugger to automatically skip third-party code (node_modules, Node.js internals, framework code) when I use `stepInto` so that I can focus on my application logic without manually stepping out of libraries, and without hitting V8 inspector crashes that occur when stepping through async/module boundaries in runtime internals.

## Requirements (EARS)

### Event-Driven
- [E1] When scripts are parsed (via `Debugger.scriptParsed` events), the system shall automatically blackbox scripts whose URLs do not match the target file set using `Debugger.setBlackboxedRanges`.
- [E2] When execution pauses in a blackboxed or third-party script (frame URL doesn't match target), the system shall automatically issue `Debugger.stepOut` or `Debugger.resume` to return to user code without manual intervention.
- [E3] When a stepping session exceeds MAX_STEPS or a configured timeout, the system shall automatically resume execution, disconnect the debug session, and exit cleanly.

### State-Driven
- [S1] While stepping through code, the system shall maintain a step counter that increments on each `Debugger.paused` event and enforces a maximum step limit to prevent infinite stepping loops.
- [S2] While blackboxing is active, the system shall track which scripts have been blackboxed to avoid duplicate blackboxing commands and to report blackboxing coverage.
- [S3] When stepping reaches the end of the target script (determined by line number or script completion), the system shall stop stepping and resume normal execution or exit the session.

### Safe-Stepping
- [SS1] When stepInto is requested in user code, the system shall verify via blackboxing that third-party code will be skipped, preventing descent into node_modules, Node.js internals, or framework code.
- [SS2] When stepInto is requested but blackboxing is not available (non-CDP protocols), the system shall fall back to dynamic URL checking and use stepOut/resume when execution lands in non-target code.
- [SS3] When stepping operations encounter known crash patterns (Node.js v24.x ESM async boundaries), the system shall use stepOver instead of stepInto or apply protective blackboxing to avoid V8 inspector crashes.

### Optional
- [O1] When analyzing call sites, the system shall detect whether the next statement is a function call and intelligently choose stepInto (for user functions) or stepOver (for third-party functions).
- [O2] When stepping configuration is provided, the system shall support allowlists (only step in these files) and denylists (never step in these patterns) for fine-grained control.

## Acceptance Criteria

### AC-E1: Auto-Blackbox Third-Party Scripts

```typescript
const autoBlackboxDemo = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const session = yield* debug.connect({
    endpoint: "http://127.0.0.1:9229",
    transport: Debug.Transport.cdp()
  })
  
  // Enable debugger
  yield* debug.enableDebugger(session)
  
  // Auto-blackbox everything except target
  const targetUrl = "file:///path/to/my-app.js"
  yield* debug.autoBlackboxThirdParty(session, [targetUrl])
  
  // Verify blackboxing works
  // Step into a call to a third-party function
  // Should land in next line of my-app.js, not inside node_modules
})
```

### AC-E2: Dynamic Safe-Stepping Fallback

```typescript
const safeStepDemo = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const session = yield* debug.connect({ ... })
  
  const targetUrls = ["file:///path/to/my-app.js"]
  
  // Start stepping session with safety checks
  yield* debug.stepThroughWithLimits(session, {
    targetUrls,
    maxSteps: 200,
    stepType: "stepOver" // or "safeStepInto"
  })
  
  // Should automatically stepOut/resume when in third-party code
  // Should stop after 200 steps
  // Should log line numbers only from my-app.js
})
```

### AC-E3: Automatic Session Termination

```typescript
const limitedSteppingDemo = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const session = yield* debug.connect({ ... })
  
  // Step with timeout and step limit
  const result = yield* debug.stepThroughWithLimits(session, {
    targetUrls: ["file:///path/to/my-app.js"],
    maxSteps: 100,
    timeout: Duration.seconds(30),
    stopAtLine: 95 // Stop after line 95 of target
  })
  
  // Should exit automatically when:
  // - 100 steps reached, OR
  // - 30 seconds elapsed, OR
  // - Line 95 reached
  
  assert(result.stepsCompleted <= 100)
  assert(result.reason === "maxSteps" || result.reason === "timeout" || result.reason === "targetComplete")
})
```

### AC-S1: Step Counter Guard

```typescript
// Integration test
it.effect("stops stepping after MAX_STEPS", () =>
  Effect.gen(function*() {
    const debug = yield* Debug.Debug
    const session = yield* debug.connect({ ... })
    
    const MAX_STEPS = 50
    let stepsObserved = 0
    
    yield* debug.stepThroughWithLimits(session, {
      targetUrls: [targetFileUrl],
      maxSteps: MAX_STEPS,
      onStep: () => Effect.sync(() => { stepsObserved++ })
    })
    
    // Should stop at exactly MAX_STEPS
    expect(stepsObserved).toBeLessThanOrEqual(MAX_STEPS)
  })
)
```

### AC-SS1: Blackboxing Prevents Third-Party Stepping

```typescript
// Integration test
it.effect("stepInto skips node_modules with blackboxing", () =>
  Effect.gen(function*() {
    const debug = yield* Debug.Debug
    const session = yield* debug.connect({ ... })
    
    yield* debug.enableDebugger(session)
    
    // Blackbox node_modules
    yield* debug.setBlackboxPatterns(session, ["node_modules/.*"])
    
    // Set breakpoint at line that calls into node_modules
    yield* debug.setBreakpoint(session, {
      url: targetFileUrl,
      lineNumber: 42 // Line that calls require('lodash')
    })
    
    // Resume to breakpoint
    yield* debug.resume(session)
    
    // Wait for pause at breakpoint
    const pausedEvent = yield* waitForPausedEvent(session)
    
    // StepInto should skip lodash and land in next line of our code
    yield* debug.stepInto(session)
    
    const nextPause = yield* waitForPausedEvent(session)
    const frame = nextPause.callFrames[0]
    
    // Should still be in our file, not in lodash
    expect(frame.url).toBe(targetFileUrl)
    expect(frame.location.lineNumber).toBe(43)
  })
)
```

### AC-SS3: StepOver Avoids V8 Crashes

```typescript
// Integration test (Node.js v24.x)
it.effect("stepOver does not crash on async boundaries", () =>
  Effect.gen(function*() {
    const debug = yield* Debug.Debug
    const session = yield* debug.connect({ ... })
    
    yield* debug.enableDebugger(session)
    
    // Step through async function without crashing
    yield* debug.stepThroughWithLimits(session, {
      targetUrls: [asyncFunctionFile],
      maxSteps: 100,
      stepType: "stepOver" // Safe choice
    })
    
    // Should complete without V8 crash
    // (If using stepInto, would crash at async boundaries)
  })
)
```

## Technical Specifications

### Blackboxing Support

**Commands to implement**:

```typescript
interface BlackboxingSupport {
  // Set regex patterns for blackboxed scripts
  readonly setBlackboxPatterns: (
    session: Session,
    patterns: Array<string>
  ) => Effect.Effect<void, DebugError>
  
  // Blackbox specific line ranges in a script
  readonly setBlackboxedRanges: (
    session: Session,
    scriptId: string,
    positions: Array<{ lineNumber: number; columnNumber: number }>
  ) => Effect.Effect<void, DebugError>
  
  // Auto-blackbox all scripts except target URLs
  readonly autoBlackboxThirdParty: (
    session: Session,
    targetUrls: Array<string>
  ) => Effect.Effect<void, DebugError>
}
```

**Implementation**:
- Wrap CDP `Debugger.setBlackboxPatterns` and `Debugger.setBlackboxedRanges`
- Subscribe to `Debugger.scriptParsed` events in autoBlackboxThirdParty
- For each parsed script, check if URL matches target set
- If not a target, send setBlackboxedRanges to blackbox entire script
- Track blackboxed scripts in session state to avoid duplicate commands

### Safe Stepping Helpers

**API**:

```typescript
interface SafeSteppingSupport {
  // Step over (safest)
  readonly stepOver: (session: Session) => Effect.Effect<void, DebugError>
  
  // Step into with safety checks
  readonly safeStepInto: (
    session: Session,
    options: { targetUrls: Array<string> }
  ) => Effect.Effect<void, DebugError>
  
  // Step out
  readonly stepOut: (session: Session) => Effect.Effect<void, DebugError>
  
  // Resume
  readonly resume: (session: Session) => Effect.Effect<void, DebugError>
  
  // Step through with limits
  readonly stepThroughWithLimits: (
    session: Session,
    options: StepThroughOptions
  ) => Effect.Effect<StepThroughResult, DebugError>
}

interface StepThroughOptions {
  readonly targetUrls: Array<string>
  readonly maxSteps: number
  readonly timeout?: Duration
  readonly stopAtLine?: number
  readonly stepType: "stepOver" | "safeStepInto"
  readonly onStep?: (info: StepInfo) => Effect.Effect<void>
}

interface StepThroughResult {
  readonly stepsCompleted: number
  readonly reason: "maxSteps" | "timeout" | "targetComplete" | "error"
  readonly finalLocation?: { file: string; line: number; column: number }
}

interface StepInfo {
  readonly stepNumber: number
  readonly file: string
  readonly line: number
  readonly column: number
  readonly functionName: string
  readonly sourceCode: string
}
```

**Implementation**:
- Wrap CDP stepping commands with URL safety checks
- For `safeStepInto`: Check if top frame URL matches targetUrls
  - If yes: send `Debugger.stepInto`
  - If no: send `Debugger.stepOut` (or `resume` if only one frame)
- For `stepThroughWithLimits`: Set up event loop that:
  - Subscribes to `Debugger.paused` events
  - Maintains step counter
  - Checks limits on each pause
  - Issues appropriate step command
  - Exits when limits reached

### Predefined Blackbox Pattern Sets

```typescript
export const BlackboxPatterns = {
  // Node.js patterns
  node: [
    "node_modules/.*",
    "^node:.*",
    "^internal/.*",
    "bootstrap_node\\.js",
    "node:internal/.*"
  ],
  
  // Browser patterns
  browser: [
    "node_modules/.*",
    "webpack://.*",
    "^chrome-extension://.*",
    "^devtools://.*",
    "<anonymous>",
    "VM[0-9]+"
  ],
  
  // Cloudflare Workers patterns
  workers: [
    "node_modules/.*",
    "^node:.*",
    "wrangler/.*",
    "miniflare/.*",
    "workerd/.*"
  ],
  
  // Framework patterns (optional, user can add)
  frameworks: (include: Array<string> = []) => [
    ...include.flatMap(fw => [`node_modules/${fw}/.*`]),
    "node_modules/react/.*",
    "node_modules/react-dom/.*",
    "node_modules/next/.*"
  ]
} as const
```

## Out of Scope

- AST-based call site analysis (determining if next statement is a function call)
- Source map integration for TypeScript stepping (use source map URLs as-is)
- Per-function stepping allowlists (step into specific functions only)
- Intelligent "step to next user code" that sets temporary breakpoints
- Visual debugging UI (this is an API-level service)
- Multi-target stepping (stepping across multiple debug sessions)

## Testing Requirements

### Unit Tests
- Mock `Debugger.scriptParsed` events and verify blackboxing commands sent
- Test step counter increments correctly
- Test step limit enforcement (stops at MAX_STEPS)
- Verify URL matching logic for target detection
- Test blackbox pattern compilation and matching

### Integration Tests

#### Test 1: Auto-Blackboxing
```typescript
it.effect("auto-blackboxes third-party scripts", () =>
  Effect.gen(function*() {
    const debug = yield* Debug.Debug
    const session = yield* debug.connect({ endpoint: nodeInspectorUrl })
    
    yield* debug.enableDebugger(session)
    
    const targetUrl = "file:///test-app.js"
    const blackboxedScripts = yield* Ref.make(new Set<string>())
    
    // Track blackboxing calls
    const events = yield* debug.subscribe(session)
    yield* Effect.fork(
      Stream.runForEach(events, (event) =>
        Effect.gen(function*() {
          if (event.method === "Debugger.scriptParsed") {
            const params = event.params as any
            if (params.url !== targetUrl) {
              yield* Ref.update(blackboxedScripts, (set) => set.add(params.url))
            }
          }
        })
      )
    )
    
    yield* debug.autoBlackboxThirdParty(session, [targetUrl])
    
    // Wait for scripts to parse
    yield* Effect.sleep(Duration.seconds(1))
    
    const blackboxed = yield* Ref.get(blackboxedScripts)
    
    // Should have