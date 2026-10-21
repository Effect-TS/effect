# @effect/drizzle-effect-v4-patch

Applies the verified Drizzle compatibility patch for Effect to a Bun project.
The patch updates Effect schema names and SQL import paths while preserving
Drizzle's query and transaction behavior. It supports `drizzle-orm@1.0.0-rc.4`.

Install your project's dependencies first, then run:

```sh
bun add drizzle-orm@1.0.0-rc.4
bunx --package @effect/drizzle-effect-v4-patch effect-drizzle-patch patch
```

Run inside the workspace that depends on Drizzle, or pass `--dir path/to/workspace`.
The CLI finds the nearest ancestor with `bun.lock` or `bun.lockb`, saves the
patch under that project's `patches/`, registers it in `package.json`, and runs
`bun install`. Commit the manifest, lockfile, and generated patch. Subsequent
Bun installs apply the patch without invoking this CLI.

The CLI rejects unsupported Drizzle versions, non-Bun package-manager declarations,
conflicting patch registrations, and modified copies of its patch. If installation
fails after configuration is saved, rerun the command to finish.

Remove this patch before changing the installed Drizzle version:

```sh
bunx --package @effect/drizzle-effect-v4-patch effect-drizzle-patch unpatch
```

Removal preserves other patch registrations and deletes this tool's unchanged
patch after `bun install` succeeds. Commit the manifest, lockfile, and patch
deletion. If installation fails, rerun `unpatch`; the patch file remains available
until installation succeeds.

The CLI requires Node.js 22.18+, 24.11+, or 26+ and a Bun project. Its Effect
runtime dependencies are installed normally and do not change the project's
Effect package.
