# @effect-native/debug

**Protocol-agnostic debugger service for Effect applications**

Control JavaScript runtime debuggers programmatically through the Chrome DevTools Protocol (CDP), WebKit Inspector, and Firefox Remote Debug Protocol—all from composable Effect programs.

---

## Motivation

You're debugging a memory leak. You need to:
1. Connect to your Node.js app's inspector
2. Enable the heap profiler
3. Take a baseline snapshot
4. Trigger the suspected leak
5. Take another snapshot
6. Compare them to find what's growing

**The manual way**: Open Chrome DevTools, click around, save snapshots, load them, click "Comparison" view, scroll through thousands of objects...

**The automated way**: Write an Effect program that does all of this for you, repeatedly, consistently, and logs the results.

Or maybe you want to:
- Step through your code programmatically and log each line execution
- Pause on every exception and capture stack traces
- Monitor heap usage continuously and alert when it grows
- Debug your Cloudflare Workers locally with full inspector access
- Build custom debugging tools tailored to your workflow

**That's what this package enables.**

---

## Goal

**Build debugging tools as Effect programs** that can:
- Connect to any JavaScript runtime's debugger (Node.js, Chrome, Deno, Workers)
- Send commands (evaluate code, set breakpoints, capture heap snapshots)
- Subscribe to events (paused, resumed, console output, heap updates)
- Compose debugging workflows with Effect's structured concurrency

**Like this**:

```typescript
import * as Effect from "effect/Effect"
import * as Debug from "@effect-native/debug"

const stepThroughMyCode = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  
  // Connect to Node.js inspector
  const session = yield* debug.connect({
    endpoint: "ws://127.0.0.1:9229/...",
    transport: Debug.Transport.cdp()
  })
  
  // Enable debugger
  yield* debug.sendCommand(session, EnableDebuggerCommand)
  
  // Subscribe to paused events
  const events = yield* debug.subscribe(session)
  
  // Log each step as code executes
  yield* Stream.runForEach(events, (event) => {
    if (event.method === "Debugger.paused") {
      const frame = event.params.callFrames[0]
      yield* Console.log(`Paused at ${frame.url}:${frame.location.lineNumber}`)
    }
  })
})
```

---

## Obstacles

### 1. Inspector Protocols Are Complex

Each runtime has its own protocol:
- **CDP** (Chrome DevTools Protocol): Chrome, Node.js, Deno, Cloudflare Workers
- **WebKit Inspector**: Safari, iOS, Bun
- **Firefox RDP**: Firefox, Servo, Ladybird

Each has different message formats, transports, and capabilities.

### 2. Low-Level API Is Tedious

Raw WebSocket messages:
```json
{"id":1,"method":"Debugger.enable"}
{"id":2,"method":"Debugger.stepOver"}
{"id":3,"method":"HeapProfiler.takeHeapSnapshot"}
```

You have to:
- Manage WebSocket connections
- Track request/response IDs
- Parse JSON messages
- Handle errors
- Subscribe to events
- Maintain session state

### 3. Edge Cases Are Everywhere

- What if the target disconnects?
- What if a command times out?
- What if you step into V8 internals and crash the debugger?
- What if the heap snapshot is 2GB and you run out of memory?
- What about reconnecting when Cloudflare Workers restarts?

### 4. No Type Safety

Raw JSON commands have no type checking. Typos cause runtime errors. Response shapes are undocumented or wrong.

---

## Solution: @effect-native/debug

This package provides:

### ✅ Protocol-Agnostic Service

One API that works across runtimes:

```typescript
// Same code works for Node.js, Chrome, Deno, Workers
const session = yield* debug.connect({
  endpoint: inspectorUrl,
  transport: Debug.Transport.cdp()
})
```

### ✅ Effect-Based API

Composable, type-safe debugging workflows:

```typescript
const debugWorkflow = Effect.gen(function*() {
  const debug = yield* Debug.Debug
  const session = yield* debug.connect({ ... })
  
  // Commands are typed with schemas
  const version = yield* debug.sendCommand(session, GetBrowserVersion)
  
  // Events are streamed with Effect streams
  const events = yield* debug.subscribe(session)
  
  // Cleanup is automatic (scoped resources)
  yield* debug.disconnect(session)
})
```

### ✅ Session Management

Automatic cleanup, error handling, reconnection:

```typescript
// Session is scoped - cleanup happens automatically
const program = Effect.scoped(
  Effect.gen(function*() {
    const session = yield* debug.connect({ ... })
    // ... do stuff
    // disconnect happens automatically even if errors occur
  })
)
```

### ✅ Schema-Based Validation

Responses are validated with Effect Schema:

```typescript
const GetBrowserVersion = command({
  transport: Transport.cdp(),
  command: "Browser.getVersion",
  response: Schema.Struct({
    product: Schema.String,
    revision: Schema.String,
    userAgent: Schema.String
  })
})

// Type-safe response
const version = yield* debug.sendCommand(session, GetBrowserVersion)
console.log(version.product) // ✅ TypeScript knows this is a string
```

---

## Installation

```bash
pnpm add @effect-native/debug effect @effect/platform @effect/platform-node
```

---

## CLI Tool: Debug Steps

The package includes a **command-line tool** for stepping through Node.js scripts line-by-line. No code required!

### Quick Start

```bash
# First, start your Node.js app with debugging enabled
node --inspect-brk=9229 my-script.js

# In another terminal, connect the stepper (auto-discovers WebSocket URL)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229

# Limit the number of steps (useful for long scripts)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500

# You can also pass the full WebSocket URL if you have it:
npx @effect-native/debug steps --ws-url ws://127.0.0.1:9229/abc-123-def-456
```

**Works with any CDP-compatible endpoint**, including:
- Node.js (`node --inspect-brk`)
- Bun (`bun --inspect-brk`)
- Deno (`deno run --inspect-brk`)
- Chrome/Chromium browsers
- Cloudflare Workers (local dev with `wrangler dev --inspector-port`)

### What It Does

The CLI tool will:
1. ✅ Connect to any CDP-compatible WebSocket debugger endpoint
2. ✅ Enable the debugger and resume execution
3. ✅ Step through **every line of execution**
4. ✅ Display function name, line number, column, and source code
5. ✅ Stop after reaching the maximum step count (default: 200)

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--ws-url <url>` | WebSocket URL or HTTP endpoint (e.g., `127.0.0.1:9229`, `http://127.0.0.1:9229`, or `ws://...`) | - |
| `--max-steps <n>` | Maximum steps to execute | 200 |
| `-h, --help` | Show help message | - |

### Example Output

```
🔍 Debug Step-Through
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 Connected to ws://127.0.0.1:9341/abc-123-def-456
✅ Debugger enabled
▶️  Runtime.runIfWaitingForDebugger invoked
⏸️  Initial pause requested
🔁 Stepping through code (Ctrl+C to stop)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[   1] my-script.js:10:0 (anonymous)
      > console.log("Starting app")
[   2] my-script.js:11:0 (anonymous)
      > const result = processData(["a", "b", "c"])
[   3] my-script.js:5:16 processData
      > const results = []
[   4] my-script.js:6:6 processData
      > for (let i = 0; i < items.length; i++) {
[   5] my-script.js:7:4 processData
      > results.push(items[i].toUpperCase())
...
🏁 Reached maximum step count (200). Exiting debugger session.
✅ Finished stepping session
```

### Use Cases

- 🐛 **Debug production issues** - Step through problematic code without modifying it
- 📚 **Learn codebases** - See execution flow of unfamiliar code
- 🔍 **Trace bugs** - Follow exact execution path to find issues
- 📊 **Analyze performance** - See which functions are called and in what order
- 🎓 **Teaching** - Demonstrate code execution to students
- 🌐 **Multi-runtime support** - Works with Node.js, Bun, Deno, browsers, and more

### Getting the WebSocket URL

The `steps` command accepts either a simple endpoint (like `127.0.0.1:9229`) or a full WebSocket URL. The tool will automatically discover the WebSocket URL from the HTTP endpoint.

**Simplest Usage** (recommended):
```bash
# Just pass the host:port - we'll discover the WebSocket URL
npx @effect-native/debug steps --ws-url 127.0.0.1:9229

# Or with http:// prefix
npx @effect-native/debug steps --ws-url http://127.0.0.1:9229
```
</text>

<old_text line=281>
When you start Node.js with `--inspect` or `--inspect-brk`, it outputs the WebSocket URL:

```bash
$ node --inspect-brk=9229 my-script.js
Debugger listening on ws://127.0.0.1:9229/abc-123-def-456
```

**Copy the entire `ws://...` URL** and pass it to the `--ws-url` option.

**Find it programmatically**:
```bash
# Query the inspector HTTP endpoint
curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl'

# Use in a one-liner
npx @effect-native/debug steps --ws-url $(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')

# Or in a script
WS_URL=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')
npx @effect-native/debug steps --ws-url "$WS_URL" --max-steps 500
```

#### Node.js

When you start Node.js with `--inspect` or `--inspect-brk`, it outputs the WebSocket URL:

```bash
$ node --inspect-brk=9229 my-script.js
Debugger listening on ws://127.0.0.1:9229/abc-123-def-456
```

**Copy the entire `ws://...` URL** and pass it to the `--ws-url` option.

**Find it programmatically**:
```bash
# Query the inspector HTTP endpoint
curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl'

# Use in a one-liner
npx @effect-native/debug steps --ws-url $(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')

# Or in a script
WS_URL=$(curl -s http://127.0.0.1:9229/json | jq -r '.[0].webSocketDebuggerUrl')
npx @effect-native/debug steps --ws-url "$WS_URL" --max-steps 500
```

#### Bun

```bash
$ bun --inspect-brk=9229 my-script.js
Debugger listening on ws://127.0.0.1:9229/abc-123-def-456

# Connect with:
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

#### Deno

```bash
$ deno run --inspect-brk=9229 my-script.ts
Debugger listening on ws://127.0.0.1:9229/abc-123-def-456

# Connect with:
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

#### Cloudflare Workers (Local)

```bash
$ wrangler dev --inspector-port=9229
Debugger listening on ws://127.0.0.1:9229/abc-123-def-456

# Connect with:
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

#### Chrome/Chromium Browsers

1. Open `chrome://inspect` in Chrome
2. Click "inspect" on your target
3. Or connect programmatically:
```bash
# Simple endpoint
npx @effect-native/debug steps --ws-url localhost:9222

# Or get the full WebSocket URL
curl http://localhost:9222/json | jq -r '.[0].webSocketDebuggerUrl'
```

#### Automation Script Example

For CI/CD or automated testing, you can wrap the workflow in a script:

```bash
#!/bin/bash
set -e

# Start your app with inspector in background
node --inspect=9229 app.js &
APP_PID=$!

# Wait for inspector to be ready
sleep 1

# Run steps (auto-discovers WebSocket URL)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229 --max-steps 500

# Cleanup
kill $APP_PID
```

---

## Quick Start
</text>


### Step Through Your Code

See every line as it executes:

```typescript
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as Stream from "effect/Stream"
import { Debug, layerCdp, Transport, command } from "@effect-native/debug"
import * as Schema from "effect/Schema"

// Define commands
const EnableDebugger = command({
  transport: Transport.cdp(),
  command: "Debugger.enable",
  response: Schema.Struct({ debuggerId: Schema.String })
})

const StepOver = command({
  transport: Transport.cdp(),
  command: "Debugger.stepOver",
  response: Schema.Struct({})
})

const program = Effect.gen(function*() {
  const debug = yield* Debug
  
  // Connect to Node.js inspector (launch your app with --inspect-brk=9229)
  const session = yield* debug.connect({
    endpoint: "ws://127.0.0.1:9229/...",
    transport: Transport.cdp()
  })
  
  // Enable debugger
  yield* debug.sendCommand(session, EnableDebugger)
  
  // Subscribe to events
  const events = yield* debug.subscribe(session)
  
  yield* Effect.forkScoped(
    Stream.runForEach(events, (event) =>
      Effect.gen(function*() {
        if (event.method === "Debugger.paused") {
          const frame = event.params.callFrames[0]
          yield* Console.log(
            `[Step] ${frame.url}:${frame.location.lineNumber} in ${frame.functionName}`
          )
          // Step to next line
          yield* debug.sendCommand(session, StepOver)
        }
      })
    )
  )
  
  // Keep running while stepping
  yield* Effect.never
})

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor)
)

Effect.runPromise(runnable)
```

**Run your app**:
```bash
# Terminal 1: Your app with inspector
node --inspect-brk=9229 your-app.js

# Terminal 2: Your debug script
node debug-script.js
```

**Output**:
```
[Step] file:///your-app.js:10 in main
[Step] file:///your-app.js:11 in main
[Step] file:///your-app.js:12 in processData
...
```

### Evaluate Code in the Runtime

```typescript
const EvaluateExpression = command({
  transport: Transport.cdp(),
  command: "Runtime.evaluate",
  params: { expression: "2 + 2", returnByValue: true },
  response: Schema.Struct({
    result: Schema.Struct({
      type: Schema.String,
      value: Schema.optional(Schema.Unknown)
    })
  })
})

const result = yield* debug.sendCommand(session, EvaluateExpression)
console.log(result.result.value) // 4
```

### Listen to Console Output

```typescript
const events = yield* debug.subscribe(session)

yield* Stream.runForEach(events, (event) =>
  Effect.gen(function*() {
    if (event.method === "Runtime.consoleAPICalled") {
      const params = event.params as any
      const args = params.args || []
      yield* Console.log("Console:", args.map(a => a.value).join(" "))
    }
  })
)
```

---

## Real-World Example: The Step-Through Demo

**See it in action**: The `steps` CLI tool (`packages-native/debug/src/cli/steps.ts`)

**Run it**:
```bash
# Terminal 1: Start your Node.js app with debugging enabled
node --inspect-brk=9229 my-script.js

# Terminal 2: Connect the stepper (auto-discovers WebSocket URL)
npx @effect-native/debug steps --ws-url 127.0.0.1:9229
```

**What it does**:
1. Connects to the provided WebSocket debugger endpoint
2. Subscribes to debugger events
3. Enables the Debugger domain
4. Calls `Runtime.runIfWaitingForDebugger` to start execution
5. Pauses immediately with `Debugger.pause`
6. For each `Debugger.paused` event:
   - Fetches the script source (if needed)
   - Logs: `[step] file:line:column function`
   - Shows the source code line
   - Calls `Debugger.stepOver` to advance
7. Stops after reaching the maximum step count (default: 200)
8. Disconnects and exits

**Works with any CDP-compatible runtime**:
- Node.js: `node --inspect-brk`
- Bun: `bun --inspect-brk`
- Deno: `deno run --inspect-brk`
- Cloudflare Workers: `wrangler dev --inspector-port=9229`
- Chrome/Chromium browsers

**Output**:
```
[   1] my-script.js:1:0 (anonymous)
      > /**
[   2] my-script.js:10:0 (anonymous)
      > console.log("🐛 Starting Simple Broken App")
[   5] my-script.js:65:16 (anonymous)
      > const result1 = processItems(["a", "b", "c"])
...
[  27] my-script.js:98:0 (anonymous)
      > setInterval(function() {
🏁 Completed stepping target script. Exiting debugger session.
```

**This proves the service works end-to-end.**

---

## API Overview

### Core Service

```typescript
interface Service {
  // Connect to an inspector
  readonly connect: (
    options: ConnectOptions
  ) => Effect.Effect<Session, DebugError, Scope.Scope>
  
  // Disconnect and cleanup
  readonly disconnect: (
    session: Session
  ) => Effect.Effect<void, DebugError>
  
  // Send a command
  readonly sendCommand: <A, I>(
    session: Session,
    cmd: Command<A, I>
  ) => Effect.Effect<A, DebugError>
  
  // Subscribe to events
  readonly subscribe: (
    session: Session
  ) => Effect.Effect<Stream.Stream<Event>, DebugError, Scope.Scope>
}
```

### Defining Commands

```typescript
import { command } from "@effect-native/debug"
import * as Schema from "effect/Schema"

const MyCommand = command({
  transport: Transport.cdp(),
  command: "Domain.method",
  params: { key: "value" }, // optional
  response: Schema.Struct({
    result: Schema.String
  })
})

const result = yield* debug.sendCommand(session, MyCommand)
```

### Error Handling

All operations return `Effect<A, DebugError>` where DebugError is a union of:
- `DebugStateError` - Invalid session or state
- `DebugTransportError` - WebSocket/network errors
- `DebugCommandError` - Command execution failed
- `DebugDecodeError` - Response schema validation failed
- `DebugInvalidMessage` - Malformed protocol message

```typescript
const program = Effect.gen(function*() {
  // ...
}).pipe(
  Effect.catchTag("DebugTransportError", (error) =>
    Console.error(`Connection failed: ${error.cause}`)
  )
)
```

---

## Supported Runtimes

| Runtime | Protocol | Inspector Flag | Discovery Endpoint |
|---------|----------|----------------|-------------------|
| **Node.js** | CDP | `--inspect=9229` | `http://127.0.0.1:9229/json` |
| **Chrome/Chromium** | CDP | `--remote-debugging-port=9222` | `http://127.0.0.1:9222/json` |
| **Deno** | CDP | `--inspect=9229` | `http://127.0.0.1:9229/json` |
| **Cloudflare Workers** | CDP | `wrangler dev --inspector-port=9229` | `http://127.0.0.1:9229/json` |
| **Bun** | WebKit | `--inspect` | (debug.bun.sh) |
| **Safari/iOS** | WebKit | (Develop menu) | (via proxy) |
| **Firefox** | RDP | `-remote-debugging-port` | TCP socket |

**Currently implemented**: CDP (Chrome/Node.js/Deno/Workers)  
**Coming soon**: WebKit, Firefox RDP

---

## Common Use Cases

### 1. Step Through Code Programmatically

**Motivation**: You want to trace execution flow through a complex function to understand what it's doing.

**Obstacle**: Manual stepping in DevTools is tedious and doesn't give you structured logs.

**Solution**:

```typescript
// Launch target: node --inspect-brk=9229 your-app.js

const stepThrough = Effect.gen(function*() {
  const debug = yield* Debug
  const session = yield* debug.connect({ endpoint: wsUrl, transport: Transport.cdp() })
  
  yield* debug.sendCommand(session, EnableDebugger)
  
  const events = yield* debug.subscribe(session)
  let stepCount = 0
  
  yield* Stream.runForEach(events, (event) =>
    Effect.gen(function*() {
      if (event.method === "Debugger.paused" && stepCount < 100) {
        const frame = event.params.callFrames[0]
        yield* Console.log(`[${stepCount++}] ${frame.url}:${frame.location.lineNumber}`)
        yield* debug.sendCommand(session, StepOver)
      }
    })
  )
})
```

**See**: `test-fixtures/debug-step-through.ts` for full implementation

### 2. Monitor Heap Usage Continuously

**Motivation**: You suspect a memory leak but need to monitor it over hours.

**Obstacle**: Chrome DevTools doesn't log heap usage over time automatically.

**Solution**: (Coming in 0.2.0 - not yet implemented)

```typescript
const monitorHeap = Effect.gen(function*() {
  const debug = yield* Debug
  const session = yield* debug.connect({ ... })
  
  yield* Effect.repeat(
    Effect.gen(function*() {
      const usage = yield* debug.memory.getHeapUsage(session)
      const usedMB = usage.usedSize / 1024 / 1024
      yield* Console.log(`Heap: ${usedMB.toFixed(2)} MB`)
      
      if (usedMB > 200) {
        yield* Alert.send("High memory usage!")
      }
    }),
    Schedule.fixed(Duration.seconds(30))
  )
})
```

### 3. Automated Leak Detection

**Motivation**: You need to detect memory leaks in CI/CD.

**Obstacle**: Manual heap snapshot comparison is slow and error-prone.

**Solution**: (Coming in 0.2.0 - not yet implemented)

```typescript
const detectLeak = Effect.gen(function*() {
  const debug = yield* Debug
  const session = yield* debug.connect({ ... })
  
  // Three-snapshot technique
  yield* saveSnapshot("baseline.heapsnapshot")
  yield* performAction()
  yield* saveSnapshot("after-first.heapsnapshot")
  yield* performAction()
  yield* saveSnapshot("after-second.heapsnapshot")
  
  const growth = yield* compareSnapshots("after-first", "after-second")
  
  if (growth.percentIncrease > 10) {
    yield* Effect.fail(new Error("Memory leak detected!"))
  }
})
```

### 4. Debug Cloudflare Workers Locally

**Motivation**: Your Workers crashes with "Worker exceeded memory limit" in production.

**Obstacle**: No inspector access in production, hard to reproduce.

**Solution**:

```bash
# Start wrangler with inspector
wrangler dev --inspector-port=9229
```

```typescript
const debugWorker = Effect.gen(function*() {
  const debug = yield* Debug
  const session = yield* debug.connect({
    endpoint: "http://127.0.0.1:9229", // wrangler dev inspector
    transport: Transport.cdp()
  })
  
  // Evaluate in worker context
  const result = yield* debug.sendCommand(session, {
    transport: Transport.cdp(),
    command: "Runtime.evaluate",
    params: { expression: "typeof Request", returnByValue: true },
    response: EvaluateResponseSchema
  })
  
  yield* Console.log("Worker global check:", result.result.value)
})
```

---

## Current Implementation Status

**Version**: 0.0.0 (pre-release)

### ✅ What's Working

- **CDP connection** to Node.js, Chrome, Deno, Cloudflare Workers (local)
- **Command execution** with schema-validated responses
- **Event subscription** via Effect streams
- **Session management** with automatic cleanup
- **Working demo**: Step-through debugger (see `test-fixtures/debug-step-through.ts`)
- **Tests**: Integration tests for Chrome and Node.js inspectors

**You can use it today** for:
- Connecting to inspectors
- Sending raw CDP commands
- Subscribing to events
- Building custom debugging tools

### ⏳ What's Coming

**Memory Debugging** (planned for 0.2.0):
- `getHeapUsage()` - Query heap statistics
- `takeHeapSnapshot()` - Capture heap snapshots (streaming)
- `startSamplingHeapProfiler()` - Low-overhead sampling
- `collectGarbage()` - Force GC

**Safe Stepping** (planned for 0.2.0):
- `setBlackboxPatterns()` - Skip third-party code when stepping
- `safeStepInto()` - StepInto with safety checks
- `stepThroughWithLimits()` - Bounded stepping with automatic exit

**Additional Protocols** (future):
- WebKit Inspector (Safari, Bun)
- Firefox RDP (Firefox, Servo, Ladybird)

---

## Examples

### Connect to Node.js Inspector

```typescript
// Launch your app: node --inspect=9229 app.js

const program = Effect.gen(function*() {
  const debug = yield* Debug
  
  // Discover WebSocket URL
  const response = await fetch("http://127.0.0.1:9229/json/list")
  const targets = await response.json()
  const wsUrl = targets[0].webSocketDebuggerUrl
  
  // Connect
  const session = yield* debug.connect({
    endpoint: wsUrl,
    transport: Transport.cdp()
  })
  
  // Send a command
  const version = yield* debug.sendCommand(session, GetBrowserVersion)
  yield* Console.log("Runtime:", version.product)
  
  yield* debug.disconnect(session)
})

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor)
)

Effect.runPromise(runnable)
```

### Set a Breakpoint

```typescript
const SetBreakpoint = command({
  transport: Transport.cdp(),
  command: "Debugger.setBreakpointByUrl",
  params: {
    lineNumber: 42,
    url: "file:///path/to/your-app.js"
  },
  response: Schema.Struct({
    breakpointId: Schema.String,
    locations: Schema.Array(Schema.Any)
  })
})

const breakpoint = yield* debug.sendCommand(session, SetBreakpoint)
yield* Console.log("Breakpoint set:", breakpoint.breakpointId)
```

### Handle Paused Events

```typescript
const events = yield* debug.subscribe(session)

yield* Stream.runForEach(events, (event) =>
  Effect.gen(function*() {
    if (event.method === "Debugger.paused") {
      const params = event.params as any
      const reason = params.reason
      const callFrames = params.callFrames || []
      
      yield* Console.log(`Paused: ${reason}`)
      yield* Console.log(`Call stack: ${callFrames.length} frames`)
      
      // Resume execution
      yield* debug.sendCommand(session, ResumeCommand)
    }
  })
)
```

---

## Advanced: Build Your Own Tools

The step-through demo (`test-fixtures/debug-step-through.ts`) shows how to build a complete debugging tool. It includes:

- **Target launching**: Spawn a Node.js process with inspector
- **Discovery**: Fetch WebSocket URL from `/json` endpoint
- **Connection**: Connect Debug service
- **Event handling**: Subscribe to paused/resumed events
- **Source fetching**: Get script source via `Debugger.getScriptSource`
- **Step control**: Use stepOver with safety limits
- **Clean exit**: Disconnect, kill process, exit gracefully

**Study it** to learn how to build your own debugging tools.

---

## Troubleshooting

### "Connection refused"

**Problem**: Can't connect to inspector

**Solution**: Ensure target is running with inspector enabled:
```bash
node --inspect=9229 your-app.js
# Check: curl http://127.0.0.1:9229/json
```

### "Worker exceeded memory limit" (Cloudflare Workers)

**Problem**: Workers crashes with no details

**Solution**: Run locally with `wrangler dev --inspector-port=9229` and connect debugger to analyze memory usage.

**See**: `packages-native/debug-demos/WORKERS-MEMORY-GUIDE.md` for comprehensive guide

### V8 Crash: "Check failed: needs_context..."

**Problem**: Node.js crashes when stepping through code

**Cause**: V8 inspector bug in Node.js v24.8.0 when using `stepInto` through ESM async boundaries

**Solution**: Use `stepOver` instead of `stepInto`, or implement blackboxing to skip third-party code

**See**: `.specs/debug/research-safe-stepping.md` for details

---

## Resources

### Documentation
- **Specifications**: `.specs/debug/` - Comprehensive research and task specs
- **Demos**: `packages-native/debug-demos/` - Memory leak detection demos
- **Guides**: 
  - Node.js leak hunting: `packages-native/debug-demos/BLOG-POST.md`
  - Workers debugging: `packages-native/debug-demos/WORKERS-MEMORY-GUIDE.md`

### Protocol References
- **CDP**: https://chromedevtools.github.io/devtools-protocol/
- **WebKit Inspector**: https://webkit.org/web-inspector/
- **Firefox RDP**: https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html

### Related Packages
- **Effect**: https://effect.website
- **@effect/platform**: https://effect.website/docs/guides/platform/introduction

---

## Contributing

This package is part of the Effect Native project. See the main repository for contribution guidelines.

**Current focus**:
- Memory debugging implementation (task-006)
- Safe stepping API (task-007)
- Documentation improvements
- Cross-runtime testing

---

## License

MIT

---

## Status

**Current Version**: 0.0.0 (pre-release)  
**Stability**: Experimental - API may change  
**Production Ready**: Core CDP features work, memory features pending

**Recommended**: Use for prototyping and internal tools. Wait for 0.1.0 for production use.

---

**Questions?** Open an issue or check the comprehensive research in `.specs/debug/`
