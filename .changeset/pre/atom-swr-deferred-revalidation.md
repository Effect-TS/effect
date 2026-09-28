---
"effect": patch
---

Defer `Atom.swr` stale refreshes until after reads, skipping them if the source becomes fresh or the atom is disposed. One-shot unmounted reads no longer refresh stale sources after disposal.
