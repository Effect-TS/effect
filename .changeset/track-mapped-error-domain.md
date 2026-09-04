---
"effect": patch
---

Constrain the mapped data-last `Effect.track(metric, mapper)` overload so source errors
must fit the mapper's error input. Saved operators and inline pipe calls now reject
incompatible errors, matching the data-first overload. Update the mapper to handle all
source errors, narrow the source error type before tracking, or constrain a generic
wrapper's error parameter to the mapper's domain.

Compatible narrower source error types are retained in the result, and the number and
order of explicit generic arguments are unchanged. Runtime behavior is unchanged; type
tests guard the corrected input relationship, while runtime tests cover preservation of
mapped success and failure behavior.
