---
"effect": patch
---

Speed up the fiber runtime and reduce its allocations: combine interrupt causes without global hashing, keep the interpreter's property and call sites from going megamorphic, dispatch map/flatMap and generator continuations directly, allocate less per scheduler cycle, derive fiber context caches instead of rebuilding them, skip copying contexts merged back into their source, and build Queue operations without closures.
