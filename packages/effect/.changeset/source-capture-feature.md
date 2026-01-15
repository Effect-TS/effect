---
"effect": minor
---

Add native call-site capture for Effect.fork() to enable meaningful span names in tracing

This feature enables supervisors to access the source location where Effect.fork() was called, solving the "anonymous span" problem in distributed tracing. When enabled via Layer.enableSourceCapture or Effect.withCaptureStackTraces(true), forked fibers capture their call site location (file, line, column, function name) which can be used by tracing supervisors to generate meaningful span names like "sendEmail (user-handlers.ts:42)" instead of "anonymous".

Key features:
- Opt-in via Layer.enableSourceCapture or Effect.withCaptureStackTraces(enabled)
- Zero cost when disabled (default) - only Error object creation overhead
- Production-ready performance optimizations:
  - Lazy parsing pattern (capture raw stack, parse only if enabled)
  - FIFO cache with 1000 entry limit (bounded memory ~100KB)
  - No global Error.stackTraceLimit mutation (thread-safe)
- Call-site capture (captures before Effect's trampolined execution)

APIs:
- Effect.withCaptureStackTraces(enabled: boolean) - Scoped control
- Layer.enableSourceCapture - Enable globally via layer
- currentSourceLocation FiberRef - Access captured location in child fiber

Implementation details:
- Pre-captures stack trace in Effect.fork() while user code is on stack
- Stores in currentSourceLocation FiberRef (not propagated to children)
- Smart frame filtering to skip Effect internals
- Cache hit rate >95% expected in typical applications

Related: atrim-ai/instrumentation#145
