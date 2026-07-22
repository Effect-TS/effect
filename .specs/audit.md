# Core and Fiber Runtime Audit

Audit date: 2026-07-22\
Audited revision: `b82248bef79fb7f9d461eac1949d2596b3e0e342`\
Primary targets: `packages/effect/src/internal/core.ts`, `packages/effect/src/internal/effect.ts`, `packages/effect/src/Scheduler.ts`, and the public `Effect`, `Fiber`, `Cause`, and scheduler contracts that reach those internals.

## Executive summary

The runtime is compact and generally careful about synchronous reentrancy, one-shot async resumption, child interruption, and avoiding unnecessary fiber creation on fast paths. However, this audit found **seven high-severity release blockers**, six medium-severity correctness or robustness issues, and three low-severity performance issues.

The highest-risk problems are:

- a pending interrupt can be lost when `interruptibleMask` changes an uninterruptible fiber back to interruptible;
- observer removal during completion can skip another observer and permanently strand a waiter;
- a throwing completion observer or runtime metric hook can prevent all later observers and completion cleanup, while also dropping other tasks from the scheduler's drained batch;
- interrupting `Fiber.joinAll` leaves observers installed on every target fiber;
- exceptions while `raceAllFirst` or the concurrent traversal engine are starting daemon workers can leak those workers permanently;
- the concurrent traversal failure aggregator mutates a shared `Cause` in place; and
- small operation budgets can make a fiber yield forever without executing its pending operation.

These findings are deterministic under controlled scheduling; they do not require OS threads. They are event-loop ordering, callback reentrancy, ownership, and lifecycle races.

### Release recommendation

Do not release the audited revision until F-01 through F-07 are fixed and have focused regression tests. F-08 through F-13 should either be fixed or have their intended contracts explicitly decided and tested before release. F-14 through F-16 are safe to schedule as performance follow-ups unless low-latency or high-cardinality scheduler workloads are release targets.

| ID   | Severity | Area                           | Finding                                                                       |
| ---- | -------- | ------------------------------ | ----------------------------------------------------------------------------- |
| F-01 | High     | Interruption                   | `interruptibleMask` can lose an already-pending interrupt and suspend forever |
| F-02 | High     | Fiber completion               | Mutating the live observer array skips observers and strands waiters          |
| F-03 | High     | Fiber completion / scheduler   | A throwing observer aborts notification, cleanup, and the scheduler batch     |
| F-04 | High     | `Fiber.joinAll`                | Interrupted joiners leave observers installed on target fibers                |
| F-05 | High     | Racing / concurrent traversal  | Exceptional registration leaks already-started daemon fibers                  |
| F-06 | High     | Concurrent failure aggregation | A reusable `Cause` is mutated in place                                        |
| F-07 | High     | Scheduling                     | Small yield budgets cause a deterministic livelock                            |
| F-08 | Medium   | Run loop robustness            | A throwing scheduler or tracer hook recursively overflows the stack           |
| F-09 | Medium   | Run options                    | `signal` and `onFiberStart` are applied after initial evaluation              |
| F-10 | Medium   | Async cancellation             | `Function.length` can suppress the promised `AbortSignal`                     |
| F-11 | Medium   | Diagnostics                    | Terminal root failures discard their computed stack annotation                |
| F-12 | Medium   | Diagnostics                    | Interruptor stack frames are stored under the target-stack key                |
| F-13 | Medium   | Memory / invariants            | Completed fibers retain context-derived services despite clearing `context`   |
| F-14 | Low      | Synchronous execution          | `runSyncExit` allocates an empty dispatcher on the synchronous fast path      |
| F-15 | Low      | Child lifecycle                | `awaitAllChildren` performs a quadratic snapshot difference                   |
| F-16 | Low      | Scheduler                      | Priority bucket insertion is linear per distinct priority                     |

## Scope and method

The audit traced these state transitions and ownership boundaries:

- primitive success and failure evaluation in `internal/core.ts`;
- fiber construction, run-loop evaluation, yielding, interruption, continuation unwinding, completion, and cleanup;
- async registration, resumption, abort propagation, and cancellation finalizers;
- observer registration/removal and the implementations of `await`, `join`, `joinAll`, and interruption;
- child-fiber ownership, daemon fibers, scope attachment, and completion middleware;
- `raceAll`, `raceAllFirst`, and the eager concurrent traversal engine used by collection combinators;
- scheduler budgets, task batching, priorities, and synchronous flushing;
- tracing, stack annotation, metrics, and completed-fiber reference cleanup; and
- `runFork`, `runCallback`, `runPromise`, and `runSync` boundary behavior.

For suspicious paths, small deterministic Node 24 probes used manual schedulers, explicit gates, throwing iterables, throwing callbacks, and direct fiber observation. The probes were temporary and are not part of the repository. Existing focused tests were also run; see [Validation](#validation).

## Detailed findings

### F-01 — High — `interruptibleMask` can lose a pending interrupt

**Location:** `packages/effect/src/internal/effect.ts:4265-4273` and `4292-4304`.

`interruptible` changes the flag to `true` and immediately checks `_interruptedCause`. `interruptibleMask` performs the same state transition but does not make that check:

```ts
fiber.interruptible = true
fiber._stack.push(setInterruptibleFalse)
return f(uninterruptible)
```

The lost-wakeup sequence is:

1. A fiber runs inside an uninterruptible region and suspends on an async gate.
2. Another fiber calls `interruptUnsafe`. The cause is recorded, but the target is not resumed because it is uninterruptible.
3. The gate resumes normally and the target enters `interruptibleMask`.
4. The target is now interruptible with a non-empty `_interruptedCause`, but no interrupt is delivered.
5. If the callback returns `Effect.never`, the target suspends forever. No second interrupt is guaranteed to arrive.

The probe ended with `interruptible === true`, one pending interrupt reason, and no exit.

**Impact:** cancellation can be permanently lost at a documented interruptibility boundary. This can strand scopes, joins, application shutdown, and resource finalizers waiting for the fiber.

**Recommendation:** centralize the `false -> true` transition so both `interruptible` and `interruptibleMask` deliver an existing pending cause consistently. Preserve mask semantics by testing whether the callback itself must be evaluated before the pending interrupt is observed, but do not allow the fiber to reach another suspension point with an undelivered cause.

Add a regression test with an explicit two-party handshake: interrupt while masked, resume the masked operation, enter `interruptibleMask(() => Effect.never)`, and assert that the fiber exits from the original interrupt without a second signal.

### F-02 — High — Removing observers during completion skips the next observer

**Location:** `packages/effect/src/internal/effect.ts:561-572`, `619-624`, and `822-844`.

Fiber completion iterates the live `_observers` array by index. Observer cancellation removes an entry with `splice`. `fiberJoinAll` invokes every accumulated cancellation function from inside its own failure observer.

For a target with observers `[joinAllObserver, awaitObserver]`:

1. `joinAllObserver` runs at index 0.
2. It cancels itself, splicing index 0 from the live array.
3. `awaitObserver` shifts to index 0.
4. The completion loop increments to index 1 and terminates.
5. Completion then clears the observer array, so the skipped waiter has no future wakeup.

The deterministic probe showed the target and failing `joinAll` fiber completed while a separately attached `Fiber.await` fiber remained suspended.

**Impact:** a valid waiter can be stranded forever merely because a different waiter handles the same completion first. Similar reentrant cancellation can arise from public `addObserver` callbacks and internal cancellation paths.

**Recommendation:** atomically detach or snapshot the pending observer collection before invoking any callback. Cancellation functions should only remove observers that are still pending; they must not structurally modify the collection currently being notified. Add tests for self-cancellation, cancellation of an earlier observer, cancellation of a later observer, and the `joinAll`/`await` ordering above.

### F-03 — High — Throwing completion hooks abort notification, cleanup, and scheduler progress

**Location:** `packages/effect/src/internal/effect.ts:619-627`; `packages/effect/src/Scheduler.ts:214-221`.

After computing an exit, `FiberImpl.evaluate` does the following in order:

1. stores `_exit`;
2. calls `runtimeMetrics.recordFiberEnd`;
3. invokes observers directly; and only then
4. clears observers, continuations, children, and context.

There is no `try/finally` around the lifecycle cleanup and no isolation between observers. A throwing observer therefore leaves `_exit` set but prevents all later observers from running and prevents cleanup. Because `_exit` is already set, later `evaluate` calls return immediately and cannot repair the state.

The default dispatcher's `runTasks` also invokes a drained batch without exception isolation. If one task throws, all later tasks in that already-drained batch are abandoned rather than left queued for another drain.

The probe attached two observers to a yielded fiber. The first threw; the second did not run, both entries remained in `_observers`, and the fiber's context was not cleared. The exception escaped the scheduler task.

This is not limited to deliberately hostile observers. Public `runCallback({ onExit })`, public `addObserver`, `race` winner hooks, lazy iterator continuations in `fiberAwaitAll`, and runtime metric hooks can all execute in this path.

**Impact:** one callback defect can strand unrelated waiters, retain the entire continuation/context graph, and drop unrelated runnable fibers from the same scheduler batch.

**Recommendation:**

1. Store the exit, detach the observer snapshot, and perform unconditional fiber teardown before invoking external hooks.
2. Invoke every observer even if another throws. Route callback failures through an explicit defect reporter, or collect and report them after notification; do not corrupt fiber completion.
3. Define the exception contract for runtime metric hooks and isolate them consistently.
4. Ensure a throwing scheduled task cannot discard later tasks from a drained batch. If the host exception must remain visible, report it separately after preserving/requeueing the remaining work.

Regression tests should cover a throwing first observer, throwing middle observer, throwing metric end hook, a throwing task followed by another task at the same and a different priority, and an observer that registers another observer on the already-completed fiber.

### F-04 — High — Interrupting `Fiber.joinAll` leaks target observers

**Location:** `packages/effect/src/internal/effect.ts:818-844`; compare the cancellation-aware implementations at `761-769` and `808-814`.

`fiberJoinAll` accumulates target observer cancellation functions but returns no cancellation effect from its `callback` registration. `callbackOptions` only installs an async finalizer when the registration returns cleanup or when an abort controller was requested. Consequently, interrupting the joining fiber completes the joiner but leaves its callback attached to every incomplete target.

A probe against a never-ending target observed one target observer before interrupting the joiner and the same observer still present afterward.

**Impact:** a cancelled `joinAll` retains its output array, callback closure, target list, and associated objects until every target eventually completes. For `Effect.never` or long-lived fibers this is permanent retention. The stale callbacks also do needless work on later target completion.

**Recommendation:** return an idempotent cleanup effect that invokes all registered cancellation functions. Implement this together with F-02 so cleanup cannot mutate the live notification array and skip other observers. Test interruption after zero, one, and many registrations, including targets that complete synchronously during setup.

### F-05 — High — Exceptional registration leaks daemon workers

**Locations:**

- `raceAllFirst`: `packages/effect/src/internal/effect.ts:1530-1560`;
- eager concurrent traversal: `packages/effect/src/internal/effect.ts:4712-4755` and `4731-4743`.

Both implementations start daemon fibers while still executing an async registration callback. Their cleanup effect is returned only after input iteration or pumping finishes. If user-controlled code throws before registration returns, `runLoop` converts the throw to a defect, but `callbackOptions` never receives the cleanup effect. Already-started daemon fibers are not children of the failing parent and continue running.

Two paths were confirmed:

#### `raceAllFirst`

A generator yielded `Effect.never` and then threw from its next step. `raceAllFirst` forked the first effect as a daemon, iteration threw, the parent exited with a defect, and the child remained live. `raceAll` is not affected by this exact iterator path because it materializes the iterable before launching children.

#### Concurrent traversal

With `concurrency: 2`, the mapper returned a never-ending effect for the first item and threw for the second. The first worker was already a daemon fiber. The parent exited with a defect and the worker remained live.

The same ownership gap applies to exceptions from `onItem`, ordered/unordered `step` processing, and iterable mechanics that run after workers exist. Repository history also shows that the earlier concurrent mapper path explicitly interrupted already-forked fibers in a `catch`; the current eager traversal replacement no longer has equivalent protection.

**Impact:** leaked fibers can retain scopes, services, spans, queues, and external operations indefinitely. They can also continue producing side effects after their parent has failed.

**Recommendation:** establish cleanup ownership before the first daemon launch. Materializing input before launch is sufficient for `raceAllFirst` if preserving laziness is not required. For eager traversal, wrap all mapper/step/pump calls that can throw after workers exist, transition to a terminal defect, interrupt the owned worker set, and await it before completing the parent. Tests must cover exceptions during initial registration and during observer-driven refill after an earlier worker completes.

### F-06 — High — Concurrent failure aggregation mutates a shared `Cause`

**Location:** `packages/effect/src/internal/effect.ts:4763-4781`, especially the push into `terminal.cause.reasons` at line 4770.

When a terminal result exists and an interrupted sibling later fails for a non-interrupt reason, the traversal engine appends that reason by casting the terminal cause's readonly reasons array to a mutable array and calling `push`.

Only one route into `terminal` makes an ownership copy: the observer-driven `runStep` result at lines 4779-4781. Fast-path exits and synchronously completed child fibers can install a terminal failure by reference. That reference may be a reusable `Effect.fail`, an exit stored by user code, or a cause concurrently used by another fiber.

The probe reused one `Effect.fail("primary")` as the terminal result while an interrupted sibling's cleanup failed with `"cleanup"`. The parent correctly contained two reasons, but the original reusable failure's cause also changed from one reason to two.

**Impact:** running one effect can permanently change the result of future runs of another effect. Concurrent runs can cross-contaminate each other's causes, producing order-dependent diagnostics and violating the public readonly/immutable model.

**Recommendation:** never mutate `terminal.cause.reasons`. Give the traversal state exclusive ownership of a fresh reasons array as soon as aggregation may occur, or combine causes through constructors that return a new cause. Add a test that keeps a reference to the original failure, performs concurrent aggregation, then reruns and re-inspects the original failure.

### F-07 — High — Small operation budgets yield forever without progress

**Location:** `packages/effect/src/internal/effect.ts:629-668`; `packages/effect/src/Scheduler.ts:153-165` and `258-260`.

On every `runLoop` entry, `currentOpCount` and the local `yielding` flag reset. When the scheduler requests a yield, the current operation is wrapped behind `yieldNow`. On resume, evaluating the successful yield marker itself consumes an operation. With a budget of 2, the still-pending original operation becomes operation 2 and is wrapped behind another yield. This repeats forever. A budget of 1 can prevent even the first original operation from running.

A manual scheduler with `MaxOpsBeforeYield = 2` repeatedly drained the one queued task. After eight resumptions, the second synchronous operation had never run, the fiber had no exit, and another task was still queued.

The public `MaxOpsBeforeYield` reference accepts an unconstrained number and documents no minimum. A custom scheduler whose `shouldYield` always returns `true` exposes the same progress problem regardless of the numeric reference.

**Impact:** a documented tuning setting can turn ordinary effects into permanent CPU/event-loop churn. This can also make tests with aggressive fairness settings hang.

**Recommendation:** make a scheduler-requested yield guarantee at least one pending primitive is evaluated before consulting `shouldYield` again. Persisting a one-operation grace flag across resumption is more robust than merely clamping the built-in budget, because it also handles custom schedulers. Validate or normalize non-finite, fractional, zero, and negative budget values. Add tests for budgets `0`, `1`, `2`, `3`, `NaN`, and a scheduler that always requests a yield.

### F-08 — Medium — Runtime-hook failures recursively re-enter the same failing hook

**Location:** `packages/effect/src/internal/effect.ts:629-675`.

The run loop catches a thrown evaluator, scheduler, or tracer hook and recursively calls `runLoop(exitDie(error))`. That recursive call immediately consults the same scheduler and tracer context. If `Scheduler.shouldYield` or the tracer's per-operation context keeps throwing, defect delivery retries recursively until JavaScript raises `RangeError: Maximum call stack size exceeded`. The `RangeError`, rather than the original defect, escapes `runFork`.

The probe used a custom scheduler whose `shouldYield` always threw. It was called thousands of times recursively before a `RangeError` escaped.

`recordFiberStart` and `recordFiberEnd` are also outside the run-loop conversion boundary; the end-hook consequences are included in F-03.

**Impact:** a faulty public scheduler or tracer integration can bypass Effect's defect model, obscure the original error, and crash synchronous callers.

**Recommendation:** make defect conversion iterative and provide a hook-independent path for delivering a defect caused by a hook itself. At minimum, disable the failing yield/tracer hook for the recovery operation. Define and test the behavior of throwing scheduler, tracer, start-metric, and end-metric hooks.

### F-09 — Medium — `RunOptions` are applied after initial synchronous evaluation

**Location:** `packages/effect/src/internal/effect.ts:5309-5333`; public contract at `packages/effect/src/Effect.ts:8832-8860`.

`runForkWith` constructs the fiber and immediately calls `fiber.evaluate(effect)`. If the effect completes synchronously, it returns before inspecting `options.signal` or invoking `options.onFiberStart`.

The probe passed an already-aborted signal and a synchronous side effect. The side effect ran and the fiber completed successfully. The `onFiberStart` hook was not invoked. More generally, every effect's first synchronous segment runs before the abort listener is attached.

The documentation says the signal interrupts the fiber and `onFiberStart` receives the created fiber. If skipping already-completed fibers is an intentional tracking optimization, that narrower contract is not documented.

**Impact:** pre-cancelled work can still perform synchronous side effects, and lifecycle tracking hooks miss short-lived fibers. A signal synchronously aborted during the initial effect segment is also observed too late to affect a synchronously completed fiber.

**Recommendation:** decide the boundary contract explicitly. For eager cancellation semantics, install the signal and mark a pre-aborted fiber interrupted before evaluation. Invoke `onFiberStart` immediately after construction, with observer teardown registered before evaluation if the hook is used for tracking. If the current behavior is intentional, rename or document the hook as receiving only fibers still live after initial evaluation, and document that signals cannot cancel the initial synchronous segment. Add tests for pre-aborted synchronous, yielding, and uninterruptible roots.

### F-10 — Medium — `Function.length` suppresses valid `AbortSignal` delivery

**Location:** `packages/effect/src/internal/effect.ts:1032-1070` and `1083-1150`.

`Effect.callback` creates an abort controller only when `register.length >= 2`. `Effect.promise` and `Effect.tryPromise` use similar arity tests. JavaScript function arity does not express whether a function reads a parameter: rest-parameter, default-parameter, and bound wrappers can all have a smaller `length` while still consuming the signal.

The public `callback` type declares `signal: AbortSignal`, not `signal?: AbortSignal`. A rest-parameter callback in the probe received `undefined`, and interruption therefore could not abort its underlying operation.

**Impact:** valid wrappers silently lose cancellation and violate the TypeScript contract. Resource cleanup then depends on completion of the underlying promise or callback rather than fiber interruption.

**Recommendation:** do not infer semantics from `Function.length`. Always provide the typed signal, or expose an explicit internal/public no-signal variant for allocation-sensitive call sites. Add regression tests for normal, defaulted, rest-parameter, and bound functions across `callback`, `promise`, and `tryPromise`.

### F-11 — Medium — Terminal root failures discard stack annotations

**Location:** `packages/effect/src/internal/core.ts:528-545`.

`exitFailCause` computes an annotated cause when `fiber.currentStackFrame` exists and correctly passes it to an error continuation. In the terminal branch, however, the conditional is reversed:

```ts
fiber.yieldWith(annotated ? this : exitFailCause(cause))
```

When annotation occurred, this returns the original unannotated exit. When annotation did not occur, it pointlessly allocates another failure exit with the unchanged cause.

The probe ran a root failure with `References.CurrentStackFrame` installed. Its terminal cause had no `Cause.StackTrace` annotation. The analogous failure observed through a continuation can retain the annotation, which explains why continuation-oriented tests do not catch the root case.

**Impact:** root error diagnostics lose the exact stack data the evaluator computed, reducing debuggability of uncaught failures.

**Recommendation:** return `exitFailCause(cause)` when `annotated` is true and reuse `this` otherwise. Add separate tests for terminal root failure, caught/sandboxed failure, and failure without a current frame.

### F-12 — Medium — Interruptor frames use the target-stack annotation key

**Location:** `packages/effect/src/internal/effect.ts:433-440`, `574-584`, `746-750`, and `847-888`.

`fiberStackAnnotations` records the interrupting fiber's frame under `Cause.StackTrace`. `interruptUnsafe` has already recorded the target fiber's current frame under that key. Interruption formatting looks for `Cause.InterruptorStackTrace`, which is never populated by this helper.

The probe interrupted a framed target from a differently framed fiber. The final cause retained `target-frame` under `Cause.StackTrace` and had no value under `Cause.InterruptorStackTrace`.

**Impact:** interruption reports identify the interruptor fiber ID but omit the interruptor's call site, even though the runtime collected it. Depending on context merge precedence, the same-key collision can also discard one of the two frames.

**Recommendation:** store `fiberStackAnnotations` under `InterruptorStackTrace.key` and retain the target's own frame under `StackTrace.key`. Add direct annotation assertions and a pretty-print test with distinct target and interruptor frame names.

### F-13 — Medium — Completion clears `context` but retains its derived objects

**Location:** `packages/effect/src/internal/effect.ts:541-555`, `619-627`, and `709-724`.

`setContext` caches scheduler, dispatcher, span, stack frame, runtime metric service, tracer context, and scheduler settings on the fiber. Completion assigns `Context.empty()` directly instead of using a teardown that resets those caches.

A completed fiber created with a custom parent span had an empty `context` but still retained the exact span object through `currentSpan`. The same applies to `currentScheduler`, `_dispatcher`, `currentTracerContext`, `runtimeMetrics`, and `currentStackFrame` depending on the supplied context and execution path.

This also creates an invariant mismatch on completed handles: `fiber.getRef(Scheduler.Scheduler)` reads the default from the now-empty context while `fiber.currentScheduler` may still be the custom scheduler cached from the old context.

**Impact:** applications that keep completed fiber handles can unintentionally retain tracing backends, scheduler closures, metric registries, spans, and their object graphs. This partially defeats the recent explicit cleanup of stacks, children, and context on exit.

**Recommendation:** introduce an explicit completion teardown rather than assigning `context` alone. Clear private derived services and dispatcher references. Decide whether public diagnostic fields should retain a lightweight final snapshot or reset to defaults, then keep `context`, `getRef`, and cached fields internally consistent. Add direct post-completion assertions; heap/`WeakRef` testing can supplement them but should not be the only regression check.

### F-14 — Low — `runSyncExit` allocates a dispatcher just to flush nothing

**Location:** `packages/effect/src/internal/effect.ts:553-556` and `5432-5439`.

`currentDispatcher` is a lazy getter that creates a dispatcher. The optional chain in `fiber.currentDispatcher?.flush()` still invokes that getter. Therefore every non-`Exit` effect passed to `runSyncExit` creates a `MixedSchedulerDispatcher`, even when the effect completed entirely synchronously and never scheduled a task.

**Impact:** avoidable allocation and initialization on a potentially hot boundary API. It also temporarily installs another reference on the completed fiber discussed in F-13.

**Recommendation:** flush only an already-created dispatcher, for example through the internal `_dispatcher?.flush()` after evaluation. Add a scheduler spy test that a purely synchronous effect does not call `makeDispatcher`, while a yielded synchronous run still flushes correctly.

### F-15 — Low — `awaitAllChildren` computes a quadratic set difference

**Location:** `packages/effect/src/internal/effect.ts:5210-5227`.

The initial children are copied to an array. On exit, every current child is checked with `initialChildren.includes(child)`, making the difference `O(initialChildren * currentChildren)`.

**Impact:** scopes with many pre-existing children and many newly created children can spend quadratic time selecting the fibers to await. This is avoidable in a lifecycle path where latency may matter during shutdown.

**Recommendation:** snapshot the initial children as a `Set` and use `has`, giving linear expected time. Benchmark with mixed initial/new child counts to establish whether a specialized empty/small-set fast path is worthwhile.

### F-16 — Low — Scheduler priority insertion is linear per priority bucket

**Location:** `packages/effect/src/Scheduler.ts:94-119`.

`PriorityBuckets.scheduleTask` scans the sorted bucket array from the beginning and may splice into the middle. Scheduling `N` tasks with `P` distinct priorities costs `O(N * P)` comparisons and up to `O(P)` movement per new bucket. With mostly distinct priorities this becomes quadratic.

**Impact:** normal Effect priorities are likely low-cardinality, so the current array is cache-friendly and probably faster in the common case. A custom workload using dynamic numeric priorities can degrade significantly.

**Recommendation:** keep the current implementation for the usual small-`P` case, but document that expectation and add a benchmark with 1, 8, 64, and thousands of distinct priorities. If high-cardinality priorities are supported, use binary search for bucket lookup/insertion or a map plus an ordered priority structure.

## Cross-cutting recommendations

### 1. Make completion a single atomic state transition

Fiber completion should have an explicit order with no externally callable code in the middle:

1. establish the final exit;
2. detach observers;
3. detach children/continuations and clear context-derived references;
4. publish the completed state; and
5. notify the detached observer snapshot with exception isolation.

That structure resolves the common root of F-02, F-03, F-04, and part of F-13.

### 2. Establish cancellation ownership before starting daemon work

Any internal async registration that launches daemon fibers should create and own its worker set before calling user iterators, mappers, steps, or hooks. Every exceptional exit from registration and every parent interruption should interrupt and await that set. This should be a reusable invariant, even if the code remains local to each combinator.

### 3. Treat immutable exits and causes as immutable at runtime

Do not cast public readonly arrays to mutable arrays. Aggregators should own fresh mutable builder arrays and freeze their logical result by constructing a new cause/exit. A small development-only freeze test for canonical exits and causes could catch similar accidental mutation.

### 4. Add adversarial scheduler tests

The scheduler suite currently covers ordinary yielding and ordering. Add a small conformance matrix for extreme budgets, repeated yield requests, throwing hooks/tasks, reentrant scheduling, and completion callbacks that schedule more work.

## Suggested regression-test matrix

| Area              | Required cases                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interrupt masks   | interrupt before entering `interruptible`; interrupt before entering `interruptibleMask`; nested restores; suspend immediately after transition                             |
| Observers         | self-remove; remove next; remove previous; add during completion; first/middle observer throws; completed-fiber immediate callback throws                                   |
| `joinAll`         | target fails first/middle/last; joiner interrupted during registration and after registration; target never completes; synchronous targets mixed with async targets         |
| Racing/traversal  | iterable throws before and after first fork; mapper throws before and after first fork; step throws during refill; leaked-worker assertion via `pollUnsafe`/finalizer latch |
| Cause aggregation | shared/reused terminal exit; two concurrent runs share the same exit; sibling interruption cleanup fails; primary failure remains unchanged                                 |
| Scheduler         | budgets 0/1/2/3/default/`NaN`; always-yield scheduler; throwing `shouldYield`; throwing task does not discard later tasks                                                   |
| Run options       | pre-aborted signal with sync/yielding/uninterruptible roots; abort during initial sync segment; `onFiberStart` on sync and async completion                                 |
| Abort signals     | normal/default/rest/bound functions for `callback`, `promise`, and `tryPromise`                                                                                             |
| Diagnostics       | terminal/caught failure stacks; distinct target and interruptor frames; pretty interruption output                                                                          |
| Cleanup           | completed fiber has no stale private services/dispatcher; context and cached public fields obey the chosen invariant                                                        |

## Validation

The following existing tests passed on the audited revision:

```text
pnpm test packages/effect/test/Fiber.test.ts packages/effect/test/Scheduler.test.ts packages/effect/test/Effect.test.ts

Test Files  3 passed (3)
Tests       222 passed (222)
```

Targeted temporary runtime probes confirmed:

- pending interruption remained undelivered across `interruptibleMask`;
- `joinAll` cancellation retained a target observer;
- observer-array mutation stranded a second waiter;
- an observer exception prevented later notification and teardown;
- a pre-aborted synchronous `runFork` completed successfully and skipped `onFiberStart`;
- a budget of 2 repeatedly yielded without running the pending operation;
- a throwing scheduler hook escaped as stack overflow;
- throwing `raceAllFirst` iteration and throwing concurrent mapping each left a daemon child live;
- concurrent aggregation mutated the original reusable failure cause;
- terminal root failure lacked its stack annotation;
- interruptor stack annotation was absent;
- a completed fiber retained its parent span; and
- a rest-parameter async callback received no `AbortSignal`.

The fact that all focused existing tests pass means these issues need new regression coverage; it does not reduce the confirmed findings.

## Limitations

This was a source-level state-machine audit with deterministic targeted probes, not a production load test or heap-profile campaign. F-14 through F-16 should be benchmarked with representative workloads before assigning optimization budgets. Browser-specific abort behavior and alternative JavaScript runtimes were not exercised. No claim is made about code outside the traced core/fiber/scheduler surfaces except where those public APIs directly enter the audited implementation.

## Positive observations and reviewed non-findings

- Async `resume` is guarded against repeated invocation, including the synchronous-registration case.
- `fiberAwait` and `fiberJoin` return observer cleanup effects and therefore unregister correctly on interruption.
- `raceAll` materializes its iterable before starting fibers, avoiding the partial-iteration leak present in `raceAllFirst`.
- The run loop restores the previous globally visible current fiber in `finally`, including nested synchronous runtime calls.
- Non-daemon children are registered with their parent and completion middleware interrupts outstanding children before parent completion, assuming completion observers themselves do not throw.
- Fast paths for already-completed exits avoid unnecessary child-fiber creation in several collection operations.

These strengths make the remaining defects relatively localized: interruption-state transition, observer publication, exceptional ownership cleanup, immutable failure aggregation, and scheduler progress guarantees are the main release-critical themes.
