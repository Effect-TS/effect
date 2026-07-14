---
"effect": patch
---

Fix multipart parser limit violations being silently swallowed

`Multipart.makeChannel` stored the parser's failure and its end-of-parse signal in the same slot, and the terminal `onDone` callback unconditionally overwrote a captured failure with the completion sentinel (`Cause.Done`). Because the parser keeps running after signalling a limit or parse error and always calls `onDone` at the end, any violation reached in the same pump as end-of-input was lost — which is always the case when the body arrives in a single chunk. As a result, `maxParts` / `maxFileSize` / `maxFieldSize` limits were not enforced and the stream completed normally instead of failing. `onDone` now only records completion when no failure was already captured.
