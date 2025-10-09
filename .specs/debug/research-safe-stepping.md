# Safe Stepping and Blackboxing Research

## Summary

Stepping through JavaScript code with debugger protocols exposes several challenges: stepping into runtime internals can trigger V8 inspector crashes, performance degradation, or simply create noise in debugging sessions. Modern debugger protocols provide **blackboxing** mechanisms to mark scripts as "uninteresting" so that step operations (stepInto, stepOver, stepOut) skip over them automatically. Combined with dynamic safe-stepping heuristics—checking frame locations before issuing step commands and using stepOut/resume when execution lands in non-target code—debugging can remain focused on user code while avoiding crashes and infinite stepping loops.

**Key Capabilities:**
- **Blackboxing** (CDP, WebKit): Mark scripts/ranges as "skip during stepping"
- **Pattern-based blackboxing**: Regex patterns for script URLs (e.g., `node_modules/.*`, `^node:.*`)
- **Range-based blackboxing**: Specific line ranges within a script
- **Dynamic safe-stepping**: Check frame URL before stepping, use stepOut/resume for non-target code
- **Step limits**: Terminate after MAX_STEPS to prevent infinite loops

**Protocols:**
- **CDP**: `Debugger.setBlackboxPatterns`, `Debugger.setBlackboxedRanges`
- **WebKit Inspector**: Blackboxing via Web Inspector settings (limited protocol support)
- **Firefox RDP**: Blackboxing via DevTools preferences (actor-based configuration)

## The Problem: Stepping into Runtime Internals

### V8 Inspector Crash (Node.js v24.8.0)

When stepping through Node.js code with `Debugger.stepInto`, execution can descend into:
- Node.js internal modules (`node:internal/*`)
- V8 runtime code
- Microtask queue handlers
- Async/await machinery
- Module loader code

**Observed crash** (Node.js v24.8.0 with ESM + async/await):
```
Fatal error in , line 0
Check failed: needs_context && current_scope_ == closure_scope_ && 
  current_scope_->is_function_scope() && !function_.is_null() 
  implies function_->context() != *context_.
```

**Crash location**: `v8_inspector::V8DebuggerAgentImpl::currentCallFrames()`

**Trigger**: Stepping into async function boundaries or module evaluation contexts where V8's inspector struggles to synthesize call frames due to scope/context mismatches.

### Performance Issues

Even when stepping doesn't crash, stepping through thousands of lines of:
- `node_modules` dependencies
- Node.js bootstrap code
- Framework internals (React, Effect runtime, etc.)

...creates noise and slows debugging to a crawl.

### Solution: Blackboxing + Safe Stepping

Combine two techniques:
1. **Blackboxing**: Tell the debugger which scripts to skip during stepping
2. **Safe stepping heuristics**: Check frame location before stepping, bail out if in non-target code

## CDP Blackboxing API

### Debugger.setBlackboxPatterns

Mark scripts matching regex patterns as blackboxed:

```json
{
  "id": 1,
  "method": "Debugger.setBlackboxPatterns",
  "params": {
    "patterns": [
      "node_modules/.*",
      "^node:.*",
      "^internal/.*",
      "bootstrap_node\\.js",
      "^file:///System/.*"
    ]
  }
}
```

**Effect**: When stepping with `stepInto`, CDP skips over blackboxed scripts and lands in the next non-blackboxed frame.

**Patterns syntax**: JavaScript regex as strings (no delimiters, no flags)

**Common patterns**:
- `node_modules/.*` - All npm dependencies
- `^node:.*` - Node.js built-in modules
- `^internal/.*` - Node.js internals
- `webpack://.*` - Webpack generated code
- `^file:///System/.*` - macOS system files
- `<anonymous>` - Anonymous eval'd code

### Debugger.setBlackboxedRanges

Mark specific line ranges within a script as blackboxed:

```json
{
  "id": 2,
  "method": "Debugger.setBlackboxedRanges",
  "params": {
    "scriptId": "42",
    "positions": [
      {
        "lineNumber": 0,
        "columnNumber": 0
      },
      {
        "lineNumber": 999999,
        "columnNumber": 0
      }
    ]
  }
}
```

**Effect**: The entire script (scriptId 42) is blackboxed from line 0 to 999999.

**Use case**: Blackbox entire third-party scripts detected at runtime (during `Debugger.scriptParsed` events).

**Note**: `positions` is an array of position pairs (start, end). For whole-script blackboxing, use one pair covering 0 to a large line number.

### When to Apply Blackboxing

**Strategy 1: At session start**
- Call `setBlackboxPatterns` immediately after `Debugger.enable`
- Use predefined patterns for common third-party code
- Works for static patterns (node_modules, node:*, etc.)

**Strategy 2: During script parsing**
- Listen to `Debugger.scriptParsed` events
- For each parsed script:
  - If `url` doesn't match target file(s), call `setBlackboxedRanges`
  - Mark entire script as blackboxed
- Works for dynamic third-party detection

**Recommended**: Combine both strategies for maximum coverage.

## WebKit Inspector Blackboxing

### Web Inspector Protocol

WebKit Inspector supports blackboxing through settings, but protocol-level control is limited:

- **UI-based**: Configure blackboxing in Web Inspector preferences
- **Protocol**: No direct `setBlackboxPatterns` equivalent in WebKit protocol
- **Workaround**: Use dynamic safe-stepping heuristics (check frame URL before stepping)

### Console Domain

WebKit's Console domain has some filtering:
```json
{
  "method": "Console.addInspectedNode",
  "params": { "nodeId": 123 }
}
```

But this doesn't affect stepping behavior.

**Recommendation**: For WebKit (Safari, Bun), rely on safe-stepping heuristics rather than blackboxing.

## Firefox RDP Blackboxing

### DevTools Preferences

Firefox RDP uses actor-based configuration:

```javascript
// Via RDP actor
{
  "to": "tabActor",
  "type": "reconfigure",
  "options": {
    "blackboxedSources": [
      "http://example.com/node_modules/react/index.js",
      "webpack:///./node_modules/**"
    ]
  }
}
```

**Protocol**: Configuration via thread actor `reconfigure` message
**Persistence**: Stored in Firefox preferences (survives sessions)
**Patterns**: URL-based, supports wildcards

**Limitation**: Less granular than CDP's regex patterns.

## Safe Stepping Heuristics

### Pattern: Check Frame URL Before Stepping

```typescript
// Pseudo-code for safe stepping
if (event.method === "Debugger.paused") {
  const topFrame = callFrames[0]
  const isTargetCode = topFrame.url === targetFileUrl
  
  if (isTargetCode) {
    // Safe to step in target code
    await debugger.stepOver() // or stepInto if needed
  } else {
    // In third-party code, get out
    if (callFrames.length > 1) {
      await debugger.stepOut() // Return to caller
    } else {
      await debugger.resume() // No caller, just resume
    }
  }
}
```

### Pattern: Blackbox During Script Parsing

```typescript
// Automatically blackbox everything except target
if (event.method === "Debugger.scriptParsed") {
  const scriptId = params.scriptId
  const url = params.url
  
  if (url !== targetFileUrl) {
    // Blackbox entire script
    await debugger.setBlackboxedRanges({
      scriptId,
      positions: [
        { lineNumber: 0, columnNumber: 0 },
        { lineNumber: 999999, columnNumber: 0 }
      ]
    })
  }
}
```

### Pattern: Step Limit Guard

```typescript
let stepCount = 0
const MAX_STEPS = 200

if (event.method === "Debugger.paused") {
  stepCount++
  
  if (stepCount >= MAX_STEPS) {
    console.log("Step limit reached, exiting")
    await debugger.resume()
    await disconnect()
    process.exit(0)
  }
  
  // Continue stepping...
}
```

### Pattern: Intelligent Step Selection

```typescript
// Choose step type based on context
if (event.method === "Debugger.paused") {
  const topFrame = callFrames[0]
  const reason = params.reason
  
  if (topFrame.url !== targetFileUrl) {
    // In third-party code
    await debugger.stepOut() // or resume
  } else if (reason === "other" && isAtCallSite(topFrame)) {
    // At a function call in our code
    if (isOurFunction(topFrame)) {
      await debugger.stepInto() // Step into our function
    } else {
      await debugger.stepOver() // Skip over third-party call
    }
  } else {
    // Normal stepping in our code
    await debugger.stepOver()
  }
}
```

## Common Blackbox Patterns

### Node.js

```javascript
const NODE_BLACKBOX_PATTERNS = [
  "node_modules/.*",        // All npm dependencies
  "^node:.*",               // Node.js built-ins (node:fs, node:path, etc.)
  "^internal/.*",           // Node.js internals
  "bootstrap_node\\.js",    // Node.js bootstrap
  "^file:///System/.*",     // macOS system files (if any)
  "<anonymous>",            // Eval'd code
  "node:internal/.*"        // Node internals (alternative pattern)
]
```

### Browsers (Chrome/Chromium)

```javascript
const BROWSER_BLACKBOX_PATTERNS = [
  "node_modules/.*",
  "webpack://.*",           // Webpack bundled code
  "^chrome-extension://.*", // Extension code
  "^devtools://.*",         // DevTools code itself
  "<anonymous>",
  "VM[0-9]+"                // Eval'd scripts
]
```

### Cloudflare Workers

```javascript
const WORKERS_BLACKBOX_PATTERNS = [
  "node_modules/.*",
  "^node:.*",
  "wrangler/.*",            // Wrangler dev server code
  "miniflare/.*",           // Miniflare internals
  "workerd/.*"              // Workerd runtime (if exposed)
]
```

### React/Framework Apps

```javascript
const FRAMEWORK_BLACKBOX_PATTERNS = [
  "node_modules/react/.*",
  "node_modules/react-dom/.*",
  "node_modules/next/.*",
  "node_modules/effect/.*",  // Unless debugging Effect itself
  "webpack://.*",
  "_next/static/.*"
]
```

## Protocol Comparison

| Feature | CDP | WebKit Inspector | Firefox RDP |
|---------|-----|------------------|-------------|
| Pattern blackboxing | ✅ setBlackboxPatterns | ❌ UI only | ⚠️ Via actor config |
| Range blackboxing | ✅ setBlackboxedRanges | ❌ | ⚠️ Limited |
| Regex patterns | ✅ Full JS regex | ❌ | ⚠️ Wildcards only |
| Dynamic blackboxing | ✅ During debugging | ⚠️ Limited | ⚠️ Limited |
| Safe for stepInto | ✅ Yes | ⚠️ Manual filtering | ⚠️ Manual filtering |

## Paste-and-Run Examples

### CDP: Blackbox node_modules

```bash
# Connect to Node.js inspector
WS=$(curl -s http://127.0.0.1:9229/json/list | jq -r '.[0].webSocketDebuggerUrl')

npx -y wscat -c "$WS" << 'EOF'
{"id":1,"method":"Debugger.enable"}
{"id":2,"method":"Debugger.setBlackboxPatterns","params":{"patterns":["node_modules/.*","^node:.*"]}}
{"id":3,"method":"Debugger.setBreakpointByUrl","params":{"lineNumber":10,"url":"file:///path/to/your-app.js"}}
{"id":4,"method":"Debugger.resume"}
EOF

# Now stepInto will skip node_modules and node: internals
```

### CDP: Blackbox Specific Script

```bash
# After receiving Debugger.scriptParsed event for scriptId "42"
npx -y wscat -c "$WS" -x '{"id":5,"method":"Debugger.setBlackboxedRanges","params":{"scriptId":"42","positions":[{"lineNumber":0,"columnNumber":0},{"lineNumber":999999,"columnNumber":0}]}}'
```

### Effect Integration: Auto-Blackbox Third-Party

```typescript
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

const autoBlackboxThirdParty = (
  session: Debug.Session,
  targetFileUrl: string
) => Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const events = yield* debug.subscribe(session)
  
  // Blackbox everything except target file
  yield* Effect.forkScoped(
    Stream.runForEach(events, (event) =>
      Effect.gen(function*() {
        if (event.method === "Debugger.scriptParsed") {
          const params = event.params as any
          const scriptId = params.scriptId
          const url = params.url || ""
          
          // Skip if this is our target file
          if (url === targetFileUrl) return
          
          // Blackbox entire script
          yield* debug.sendCommand(session, {
            transport: Debug.Transport.cdp(),
            command: "Debugger.setBlackboxedRanges",
            params: {
              scriptId,
              positions: [
                { lineNumber: 0, columnNumber: 0 },
                { lineNumber: 999999, columnNumber: 0 }
              ]
            },
            response: Schema.Struct({})
          })
        }
      })
    )
  )
})
```

### Effect Integration: Safe StepInto

```typescript
const safeStepInto = (
  session: Debug.Session,
  targetFileUrl: string,
  currentFrame: CallFrame
) => Effect.gen(function*() {
  const debug = yield* Debug.Debug
  
  // Check if we're in target code
  if (currentFrame.url === targetFileUrl) {
    // Safe to step into
    yield* debug.sendCommand(session, {
      transport: Debug.Transport.cdp(),
      command: "Debugger.stepInto",
      response: Schema.Struct({})
    })
  } else {
    // In third-party code, step out or resume
    if (callFrames.length > 1) {
      yield* debug.sendCommand(session, {
        transport: Debug.Transport.cdp(),
        command: "Debugger.stepOut",
        response: Schema.Struct({})
      })
    } else {
      yield* debug.sendCommand(session, {
        transport: Debug.Transport.cdp(),
        command: "Debugger.resume",
        response: Schema.Struct({})
      })
    }
  }
})
```

## Strategies for Safe Stepping

### Strategy 1: Blackbox Everything Except Target (Safest)

**When**: You only care about one file (or a small set of files)

**Implementation**:
1. Call `Debugger.setBlackboxPatterns` with patterns for all third-party code
2. During `scriptParsed` events, blackbox any script that's not in your target set
3. Use `stepInto` freely—CDP handles the filtering

**Pros**:
- Cleanest code
- CDP does the work
- Works across different Node.js/Chrome versions

**Cons**:
- Requires CDP (not available in all protocols)
- Must maintain pattern list

### Strategy 2: Dynamic Safe-Stepping (Most Robust)

**When**: Blackboxing isn't available or you want fine-grained control

**Implementation**:
1. On each `Debugger.paused` event, check `callFrames[0].url`
2. If URL matches target files:
   - Use `stepOver` (safest) or `stepInto` (if call is to your code)
3. If URL is third-party/internals:
   - Use `stepOut` (if callFrames.length > 1) or `resume`

**Pros**:
- Works without blackboxing
- Works across all protocols
- Fine-grained control

**Cons**:
- More code to maintain
- Must check on every pause

### Strategy 3: Hybrid (Recommended)

**Combine blackboxing + safe-stepping**:

1. Set blackbox patterns for known third-party code
2. During `scriptParsed`, blackbox anything not in target set
3. During `paused`, still check frame URL as a safety net
4. Add step limit (MAX_STEPS) to prevent infinite loops

**Benefits**:
- Defense in depth
- Handles edge cases blackboxing might miss
- Prevents infinite stepping
- Works even if blackboxing fails

## Step Command Reference

### stepInto
- **Behavior**: Step into next function call, or to next statement if no call
- **Risk**: Can descend into third-party code and trigger V8 crashes
- **Use when**: Blackboxing is active OR you've verified the call is to your code

### stepOver
- **Behavior**: Execute next statement, skip over function calls
- **Risk**: Low—stays at same call depth
- **Use when**: You want to stay in current function

### stepOut
- **Behavior**: Resume until current function returns, then pause
- **Risk**: Low—goes up the call stack
- **Use when**: You're in third-party code and want to return to your code

### resume
- **Behavior**: Continue execution until next breakpoint/pause
- **Risk**: Low—just continues
- **Use when**: You want to skip over large sections or you're stuck in internals

## Preventing Infinite Loops

### Problem

Stepping through code can create infinite loops:
- setInterval/setTimeout callbacks execute forever
- Event listeners fire repeatedly
- Recursive functions
- Infinite while loops

### Solution: Step Limits

```typescript
const MAX_STEPS = 200

let stepCount = 0

if (event.method === "Debugger.paused") {
  stepCount++
  
  if (stepCount >= MAX_STEPS) {
    yield* Console.log(`🏁 Step limit (${MAX_STEPS}) reached`)
    yield* debug.sendCommand(session, ResumeCommand)
    yield* debug.disconnect(session)
    yield* Effect.sync(() => process.exit(0))
  }
  
  // Continue stepping...
}
```

### Solution: Target Line Limit

```typescript
// Stop stepping after reaching end of target script
const TARGET_LAST_LINE = 100

if (event.method === "Debugger.paused") {
  const lineNumber = callFrames[0].location.lineNumber
  
  if (lineNumber >= TARGET_LAST_LINE) {
    yield* Console.log("🏁 Reached end of target script")
    yield* debug.sendCommand(session, ResumeCommand)
    yield* cleanupAndExit()
  }
}
```

### Solution: Timeout

```typescript
// Add timeout to entire stepping session
const steppingSession = Effect.gen(function*() {
  // ... stepping logic
  yield* Effect.never
}).pipe(
  Effect.timeoutFail({
    duration: Duration.seconds(30),
    onTimeout: () => new Error("Stepping timeout")
  }),
  Effect.catchAll((error) =>
    Effect.gen(function*() {
      yield* Console.log("⏱️  Stepping timeout, exiting")
      yield* cleanupAndExit()
    })
  )
)
```

## Best Practices

### Do This ✅

- **Set blackbox patterns** immediately after enabling debugger
- **Check frame URL** before stepping, even with blackboxing
- **Use stepOver** as default (safest)
- **Add step limits** (MAX_STEPS) to prevent infinite loops
- **Add timeout** to stepping sessions
- **Blackbox during scriptParsed** for runtime-discovered third-party code
- **Test on multiple Node.js versions** (V8 inspector behavior varies)

### Don't Do This ❌

- **Blind stepInto** without blackboxing or URL checking
- **Infinite stepping** without limits or exit conditions
- **Assume blackboxing works** (always add fallback checks)
- **Step into async internals** (known crash trigger in Node.js 24.x)
- **Forget to cleanup** (disconnect session, kill target process)

## Troubleshooting

### "Check failed: needs_context..." V8 Crash

**Cause**: Stepping into async/module boundary where V8 can't synthesize frames

**Fix**:
- Use `stepOver` instead of `stepInto`
- Blackbox the script causing issues
- Add URL check before stepping
- Try different Node.js version (v20.x is more stable)

### Stepping Goes into node_modules

**Cause**: Blackboxing not configured or patterns don't match

**Fix**:
- Check blackbox patterns include `node_modules/.*`
- Verify patterns were applied (send command successfully)
- Add dynamic blackboxing during scriptParsed
- Use safe-stepping fallback (check URL, stepOut if wrong)

### Infinite Stepping Loop

**Cause**: Stepping through setInterval/event loop code

**Fix**:
- Add MAX_STEPS limit
- Check line number, stop after target script ends
- Add session timeout
- Check if in infinite loop (same line repeatedly) and resume

### StepOut Doesn't Return to My Code

**Cause**: Call stack entirely in third-party code

**Fix**:
- Use `resume` instead of `stepOut`
- Set breakpoint in your code and resume to it
- Check all frames, not just top frame

## Integration with @effect-native/debug

### High-Level API Proposal

```typescript
interface DebuggerControl {
  // Blackboxing
  readonly setBlackboxPatterns: (
    patterns: Array<string>
  ) => Effect.Effect<void, DebugError>
  
  readonly setBlackboxedRanges: (
    scriptId: string,
    ranges: Array<{ start: Position; end: Position }>
  ) => Effect.Effect<void, DebugError>
  
  // Safe stepping
  readonly safeStepInto: (
    targetUrls: Array<string>
  ) => Effect.Effect<void, DebugError>
  
  readonly safeStepOver: Effect.Effect<void, DebugError>
  
  readonly stepOut: Effect.Effect<void, DebugError>
  
  // Auto-blackboxing
  readonly autoBlackboxThirdParty: (
    targetUrls: Array<string>
  ) => Effect.Effect<void, DebugError>
}
```

### Example Usage

```typescript
const stepThroughMyCode = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const session = yield* debug.connect({
    endpoint: "http://127.0.0.1:9229",
    transport: Debug.Transport.cdp()
  })
  
  // Enable debugger
  yield* debug.sendCommand(session, EnableDebuggerCommand)
  
  // Blackbox third-party code
  yield* debug.setBlackboxPatterns(session, [
    "node_modules/.*",
    "^node:.*",
    "^internal/.*"
  ])
  
  // Auto-blackbox scripts as they're parsed
  yield* debug.autoBlackboxThirdParty(session, [
    "file:///path/to/my-app.js"
  ])
  
  // Start stepping with limits
  yield* debug.stepThroughWithLimits(session, {
    maxSteps: 200,
    timeout: Duration.seconds(30),
    targetUrls: ["file:///path/to/my-app.js"]
  })
  
  yield* debug.disconnect(session)
})
```

## References

### CDP Documentation
- Debugger.setBlackboxPatterns: https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-setBlackboxPatterns
- Debugger.setBlackboxedRanges: https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-setBlackboxedRanges
- Debugger.stepInto: https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepInto
- Debugger.stepOver: https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepOver
- Debugger.stepOut: https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepOut

### WebKit Inspector
- Web Inspector Protocol: https://github.com/WebKit/WebKit/tree/main/Source/JavaScriptCore/inspector/protocol
- Debugger domain: https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/inspector/protocol/Debugger.json

### Firefox RDP
- Remote Debugging Protocol: https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html
- Thread actor: https://firefox-source-docs.mozilla.org/devtools/backend/actors.html

### V8 Inspector Issues
- V8 issue tracker: https://bugs.chromium.org/p/v8/issues/list
- Node.js inspector issues: https://github.com/nodejs/node/labels/inspector

### Related
- Chrome DevTools blackboxing UI: https://developer.chrome.com/docs/devtools/settings/ignore-list/
- VS Code skip files: https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_skipping-uninteresting-code

## Lessons Learned

### From Implementation

1. **stepOver is safer than stepInto** for general stepping
   - stepInto can descend into V8/Node internals
   - stepOver stays at same depth, avoiding crashes

2. **Blackboxing is essential** for stepInto
   - Without it, stepInto becomes unusable in real applications
   - Patterns must be comprehensive (node_modules, node:, internal)

3. **Always add step limits** to prevent infinite loops
   - Callbacks, timers, and loops can cause endless stepping
   - Exit conditions: MAX_STEPS, target line limit, timeout

4. **URL checking is a safety net**
   - Even with blackboxing, check frame URL before stepping
   - Defense in depth prevents crashes from blackboxing edge cases

5. **V8 inspector has bugs** in certain contexts
   - Node.js v24.8.0: Crashes when stepping through ESM async boundaries
   - Workaround: Use stepOver, or use CommonJS, or downgrade to Node v20
   - These bugs are version-specific and may be fixed in future releases

6. **Different protocols need different strategies**
   - CDP: Full blackboxing support
   - WebKit: Limited protocol support, rely on URL checking
   - Firefox: Actor-based config, less dynamic

### Production Recommendations

- **Default to stepOver** for automated stepping tools
- **Require explicit opt-in** for stepInto (with blackboxing)
- **Always set step limits** (200-500 steps typical)
- **Always add timeout** (30-60 seconds typical)
- **Blackbox by default** (node_modules, node:, internal)
- **Log when bailing out** (helpful for debugging the debugger)
- **Test on multiple Node versions** before releasing

## Future Work

- Implement smart stepInto that analyzes call target before stepping
- Add AST-based call site detection (know if next statement is a call)
- Build allowlist/denylist configuration for stepping
- Add per-function stepping (step into specific functions only)
- Integrate with source maps to step through TypeScript intelligently
- Add "step to next user code" helper (resume until back in target files)