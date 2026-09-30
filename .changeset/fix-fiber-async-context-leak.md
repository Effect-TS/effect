---
"effect": patch
---

Resume fibers in their own `AsyncLocalStorage` context when another fiber wakes or interrupts them, such as a `Pool` waiter, a `Deferred` awaiter or a joined fiber.
