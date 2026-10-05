---
"effect": patch
---

Make `Atom.windowFocusSignal` and `Atom.refreshOnWindowFocus` work when `window` is undefined, so reading them during server rendering no longer throws `ReferenceError: window is not defined`.
