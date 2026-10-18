---
"effect": patch
---

Fix dependency tracking for plain serializable atoms after hydration. Hydrated plain effect and stream atoms now run on mount, including on the client after SSR, just as wrapped atoms do; a hydrated value no longer skips that initial run.
