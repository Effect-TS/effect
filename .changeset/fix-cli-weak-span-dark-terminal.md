---
"@effect/cli": patch
---

Fix `@effect/cli` help output to use `Ansi.blackBright` instead of `Ansi.black` for `Weak` spans. The previous black foreground was invisible on dark terminal backgrounds.
