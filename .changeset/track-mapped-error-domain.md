---
"effect": patch
---

Constrain the mapped data-last `Effect.track(metric, mapper)` overload so source errors
must fit the mapper's error input. Saved operators and inline pipe calls now reject
incompatible errors, matching the data-first overload. Update the mapper to handle all
source errors, or narrow the source error type before tracking.

Compatible narrower source error types are retained in the result, and the number and
order of explicit generic arguments are unchanged. Runtime metric updates are unchanged.
