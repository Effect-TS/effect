---
"effect": minor
---

Add the unstable `PathFilter` module and `FileSystem.glob` `filter` option, which also accepts a list of rules (`PathFilter.Input`), plus experimental `IgnoreFile` parsers that build `PathFilter`s from `.gitignore` and `.dockerignore` sources.

### Breaking changes

- `FileSystem.glob` no longer accepts `exclude`. Pass the patterns as `PathFilter.exclude` rules after any other rules, so they take precedence:

  ```ts
  // before
  fs.glob("**/*.ts", { exclude: ["**/*.test.ts"] })
  // after
  fs.glob("**/*.ts", { filter: [PathFilter.exclude("**/*.test.ts")] })
  // with an existing filter
  fs.glob("**/*.ts", { filter: PathFilter.concat(filter, [PathFilter.exclude("**/*.test.ts")]) })
  ```

  Unlike `exclude`, rules never drop `.`, a directory-only rule such as `link/` does not match a link to a directory, and with any `filter` an absolute pattern, a `..` segment or an escaped `/` is a defect.
