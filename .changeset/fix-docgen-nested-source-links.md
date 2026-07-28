---
"@effect/docgen": patch
---

Fix source links for modules in nested directories

`[Source]` links in the generated markdown were built from only the file's base name, so modules in subdirectories of `srcDir` (e.g. `src/nested/File.ts`) linked one directory too high. Links now use the module's path relative to `srcDir`, matching how the markdown output paths are computed.
