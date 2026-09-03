---
"effect": patch
---

Fix inference for saved curried `Context.get` getters so they accept contexts containing the required service. Saved reference getters also accept contexts without an override and use the reference default. Contexts missing a required service remain rejected, and valid existing calls with three explicit type arguments remain supported. Runtime behavior is unchanged.
