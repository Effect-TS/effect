---
"effect": minor
---

Add the unstable `PathFilter` module, make `FileSystem.glob` take a single `PathFilter.Input` instead of a pattern and options, and add experimental `IgnoreFile` parsers that build `PathFilter`s from `.gitignore` and `.dockerignore` sources.
