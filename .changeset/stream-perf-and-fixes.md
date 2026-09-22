---
"effect": patch
---

Fix `Stream.share` losing elements and hanging, and fix late consumers of `Stream.broadcast` hanging. `Stream.share` started the upstream before its first consumer subscribed, so that consumer could miss elements and, when it also missed the end, never finish. The end of the upstream was only a message to the current subscribers, so a consumer that subscribed after it (a late consumer of `Stream.broadcast`, or of `Stream.share` with `idleTimeToLive`) never finished, and the `dropping` strategy could drop a subscriber's copy of the end, in `Stream.broadcastN` too. `Stream.share` now subscribes its first consumer before starting the upstream, and every subscriber ends with the upstream's result whenever it subscribed. `Stream.broadcast` and `Stream.broadcastN` still start the upstream when they are created.

Fix `Stream.mapEffect` with `concurrency` above 1 hanging when the function throws synchronously while other effects are in flight. The function was called outside the fiber forked for the element, so the throw waited behind the in-flight effects. A throw now behaves exactly like returning `Effect.die`: the stream fails, the other in-flight effects are interrupted and upstream resources are released. This also fixes the concurrent forms of `Stream.tap`, `Stream.tapBoth`, `Stream.bindEffect`, `Stream.partitionEffect` and `Channel.tap`.

Fix `Stream.callback` and `Channel.callbackArray` hanging when the registration effect fails or dies. Its result was never observed, so the stream waited forever. The failure now fails the stream, after the elements offered before it.

Fix `Sink.collect`, `Sink.take` and `Stream.mapAccum` throwing `RangeError: Maximum call stack size exceeded` on large input. They appended with `push(...xs)`, which passes every element as a call argument, so a single large chunk (for example from `Stream.fromIterable` on a large array, which emits one chunk, or `Stream.groupedWithin` over it) or a large `mapAccum` output overflowed the stack; in Node this happens somewhere between 120,000 and 150,000 elements. They now return the full result.

Fix `Stream.forever` and `Stream.repeat` getting slower and holding more memory with every repetition. Each repetition nested another layer that every later pull went through, so `n` repetitions took O(n²) time and kept O(n) memory until the stream ended. Repetitions now run as a loop, in constant time and memory each.

`Stream.concat` runs a tree of nested concatenations as one flat sequence of its parts, so a chain of `n` concatenations costs O(n) instead of O(n²).

Sequential `Stream.mapEffect` (and `Stream.tap` and `Stream.flattenEffect`, which use it) applies the effect while walking each upstream chunk in one stage, instead of flattening, mapping and re-wrapping each element in three.

The effectful folds `Sink.reduceWhileEffect` (and `Sink.reduceEffect` and `Sink.findEffect`), `Sink.takeWhileEffect` (and `Sink.takeUntilEffect`), and `Sink.takeWhileFilterEffect` pass each element's result straight to the fold loop, instead of wrapping every element's effect in extra steps. `Channel.runFoldEffect` updates its state in the fold loop's step instead of mapping each result.

Element order, effect order, resource release order, failure and interruption behavior are unchanged. One timing difference: a loop that never suspends now takes fewer run-loop steps per element, so it reaches the scheduler's yield budget after more elements, and an interrupt sent from another fiber can land at a later element.
