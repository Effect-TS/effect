---
"effect": patch
---

Fix spans that were never ended when a traced region was interrupted as it started, and cut the work every traced region repeats.

`Effect.withSpan`, `Effect.useSpan` and `Effect.fn` started a span in one step and installed the finalizer that ends it in the next, and `Effect.withSpan`, `Effect.withParentSpan` and `Effect.fn` set the parent span in one step and installed the finalizer that restores the context in the next. A scheduler yield can fall between the two steps, and an interruption during that yield unwinds the fiber without the finalizer: the span stayed `Started`, so a backend never received it, or an enclosing region's finalizers still saw the inner span as the current parent span. Each traced region is now one primitive that starts the span, provides it with its stack frame, and pushes the frame that ends the span and restores the context, all in one evaluation.

`HttpMiddleware.tracer` installed the finalizer that ends its server span as an interruptible frame, which an interrupted fiber unwinds without running, so an interrupted request left its span `Started` and its context in place. The finalizer now runs on every exit, and the span starts after it is installed.

The same primitive also removes most of the per-span work: the region no longer builds a chain of `onExit`, `suspend` and `provideService` wrappers per span, `Effect.fn` builds its definition stack frame once per function instead of once per call, the tracer and the tracer-enabled flag are read from the fiber's cache, and the clock is resolved only when the span is timed.
