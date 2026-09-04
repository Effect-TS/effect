---
"@effect/docgen": patch
---

Generate module page paths relative to the configured source directory, preserving distinct nested modules when using nondefault source roots. The default `src` layout is unchanged.

For nondefault source roots, update links to previously collapsed or incorrectly prefixed module page paths. Regeneration removes stale generated `.ts.md` pages at their old locations; no redirects are created.
