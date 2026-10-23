---
"effect": patch
---

Keep upstream stream failures out of sink error handlers in `Stream.run`, `Stream.peel` and `Stream.aggregate`/`Stream.aggregateWithin`. Upstream failures now reach the caller unchanged instead of being remapped or recovered by `Sink.mapError`, `Sink.catch`, `Sink.catchCause` or `Sink.orElse`, and `Sink.onExit` observes them as an interruption.
