---
"@effect/platform-node-shared": patch
---

Honor `bufferSize` in `NodeStream.fromReadable`, `fromDuplex`, and `pipeThroughDuplex` so it caps how many readable chunks are taken per pull.
