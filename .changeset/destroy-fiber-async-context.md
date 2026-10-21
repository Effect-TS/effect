---
"effect": patch
---

Destroy the `AsyncResource` a fiber captures when it yields once the fiber resumes, so tools like vitest's `detectAsyncLeaks` no longer report `effect/Fiber` leaks.
