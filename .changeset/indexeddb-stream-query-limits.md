---
"@effect/platform-browser": patch
---

Honor IndexedDB select limits when streaming across multiple chunks. Streams now stop at the requested limit even when it is not a multiple of the chunk size, instead of emitting extra rows from the final chunk.
