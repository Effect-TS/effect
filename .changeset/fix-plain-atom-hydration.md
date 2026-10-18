---
"effect": patch
---

Fix dependency tracking for hydrated plain serializable atoms. They now build on first read or mount like wrapped atoms, so hydrated effect and stream atoms run on mount after SSR instead of skipping that initial run.
