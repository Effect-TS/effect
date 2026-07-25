An opinionated documentation generator for Effect projects.

# Credits

This library was inspired by the following projects:

- [docs-ts](https://github.com/gcanti/docs-ts)

# Setup

1. Install `@effect/docgen` as a dev dependency:

```shell
pnpm add @effect/docgen -D
```

2. (Optional) Add a `docgen.json` configuration file.

```json
{
  "$schema": "node_modules/@effect/docgen/schema.json"
}
```

3. Add the following script to your `package.json` file:

```json
{
  "scripts": {
    "docgen": "docgen"
  }
}
```

> [!WARNING]
> To use "@effect/docgen", Node.js 20.19+, 22.12+, or 24+ is required.

## Workspace Validation

Use `--validate` to run workspace discovery, source analysis, and semantic documentation checks without writing Markdown or example modules:

```shell
docgen --validate
```

Validation can be restricted with repeatable, case-insensitive package-slug and workspace-relative source-path filters:

```shell
docgen --validate --package effect --path Array.ts
```

Package and path filters require `--validate`.

## Input Frontends

Source analysis is the default and does not require package builds. Select declaration analysis explicitly with `--frontend declaration` or `"frontend": "declaration"` in `docgen.json`. Declaration analysis reads the effective published surface from package manifests and analyzes only its `.d.ts`, `.d.mts`, or `.d.cts` targets. It supports workspace packages and a single built, installed, or unpacked package when docgen is invoked from that package root.

Declaration maps are used when present to recover original source links and validation locations. Missing maps are not fatal; generated declaration locations remain available as provenance and fallback diagnostics.

## Output Projections

Ordinary generation writes package-local `docs` and `examples` directories from one semantic documentation model. Pass `--no-docs` or `--no-examples` to disable either projection independently. The equivalent configuration fields are `generateDocs` and `generateExamples`.

Pass `--json <file>` to write the renderer-independent semantic model as one JSON file for the entire run. The JSON projection contains the selected packages, modules, and extracted examples, but excludes validation diagnostics. It can be generated independently of the built-in projections:

```shell
docgen --no-docs --no-examples --json artifacts/docgen.json
```

Examples retain their original TypeScript module source, including static imports, exports, module scope, and top-level await. The next docgen run removes and recreates marker-owned selected package output, preventing stale examples. Docgen refuses to overwrite an unowned `examples` directory.

Docgen does not typecheck or execute generated examples. Repositories should provide checked-in TypeScript and Vitest configuration for those separate development workflows. This repository uses:

```shell
pnpm exec tsc --noEmit --project tsconfig.examples.json
pnpm exec vitest run --config vitest.examples.config.ts
```

The custom runner represents every generated module as one metadata-named test without executing it during collection. Package-specific Vitest projects preserve package-local dependency resolution, and generated modules remain available for manual editing and reruns.

## Example Configuration

The `docgen.json` configuration file allows you to customize `docgen`'s behavior. Here's an example configuration:

```json
{
  "exclude": ["src/internal/**/*.ts"],
  "parseCompilerOptions": {
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "paths": {
      "@effect/<project-name>": ["./src/index.js"],
      "@effect/<project-name>/test/*": ["./test/*.js"],
      "@effect/<project-name>/examples/*": ["./examples/*.js"],
      "@effect/<project-name>/*": ["./src/*.js"]
    }
  }
}
```

# Supported JSDoc Tags

| Tag           | Description                                                                                                                                                                                                                   | Default   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `@category`   | Groups associated module exports together in the generated documentation.                                                                                                                                                     | `'utils'` |
| `@example`    | Allows usage examples to be provided for your source code and extracted as package-local TypeScript modules.                                                                                                                  |           |
| `@since`      | Allows for documenting most recent library version in which a given piece of source code was updated.                                                                                                                         |           |
| `@deprecated` | Marks source code as deprecated, which will ~~strikethrough~~ the name of the annotated module or function in the generated documentation.                                                                                    | `false`   |
| `@internal`   | Prevents `docgen` from generating documentation for the annotated block of code. Additionally, if the `stripInternal` flag is set to `true` in `tsconfig.json`, TypeScript will not emit declarations for the annotated code. |           |
| `@ignore`     | Prevents `docgen` from generating documentation for the annotated block of code.                                                                                                                                              |           |

By default, `docgen` will search for files in the `src` directory and will output generated files into a `docs` directory. For information on how to configure `docgen`, see the [Configuration](#configuration) section below.

# Configuration

`docgen` is meant to be a zero-configuration command-line tool by default. However, there are several configuration settings that can be specified for `docgen`. To customize the configuration of `docgen`, create a `docgen.json` file in the root directory of your project and indicate the custom configuration parameters that the tool should use when generating documentation.

The `docgen.json` configuration file adheres to the following interface:

```ts
interface Config {
  readonly projectHomepage?: string
  readonly srcLink?: string
  readonly srcDir?: string
  readonly outDir?: string
  readonly theme?: string
  readonly enableSearch?: boolean
  readonly enforceDescriptions?: boolean
  readonly enforceExamples?: boolean
  readonly enforceVersion?: boolean
  readonly generateDocs?: boolean
  readonly generateExamples?: boolean
  readonly frontend?: "source" | "declaration"
  readonly workspace?: boolean
  readonly packageHomepages?: Readonly<Record<string, string>>
  readonly exclude?: ReadonlyArray<string>
  readonly parseCompilerOptions?: string | Record<string, unknown>
}
```

The following table describes each configuration parameter, its purpose, and its default value.

| Parameter            | Description                                                                                                                                                                         | Default Value                      |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| projectHomepage      | Will link to the project homepage from the [Auxiliary Links](https://pmarsceill.github.io/just-the-docs/docs/navigation-structure/#auxiliary-links) of the generated documentation. | `homepage` in `package.json`       |
| srcLink              | Will link to the project source code.                                                                                                                                               | `{projectHomepage}/blob/main/src/` |
| srcDir               | The directory in which `docgen` will search for TypeScript files to parse.                                                                                                          | `'src'`                            |
| outDir               | The directory to which `docgen` will generate its output markdown documents.                                                                                                        | `'docs'`                           |
| theme                | The theme that `docgen` will specify should be used for GitHub Docs in the generated `_config.yml` file.                                                                            | `'mikearnaldi/just-the-docs'`      |
| enableSearch         | Whether or not search should be enabled for GitHub Docs in the generated `_config.yml` file.                                                                                        | `true`                             |
| enforceDescriptions  | Whether or not descriptions for each module export should be required.                                                                                                              | `false`                            |
| enforceExamples      | Whether or not `@example` tags for each module export should be required. (**Note**: examples will not be enforced in module documentation)                                         | `false`                            |
| enforceVersion       | Whether or not `@since` tags for each module export should be required.                                                                                                             | `true`                             |
| generateDocs         | Whether to generate Markdown documentation.                                                                                                                                         | `true`                             |
| generateExamples     | Whether to generate extracted TypeScript example modules.                                                                                                                           | `true`                             |
| frontend             | Whether to analyze TypeScript source or published declaration files.                                                                                                                | `'source'`                         |
| workspace            | Whether to analyze publishable packages in the current workspace.                                                                                                                   | `false`                            |
| packageHomepages     | Package-specific homepage overrides used during workspace generation.                                                                                                               | `{}`                               |
| exclude              | An array of glob strings specifying files that should be excluded from the documentation.                                                                                           | `[]`                               |
| parseCompilerOptions | tsconfig for parsing options (or path to a tsconfig)                                                                                                                                | {}                                 |

# FAQ

**Q:** For functions that have overloaded definitions, is it possible to document each overload separately?

**A:** No, `docgen` will use the documentation provided for the first overload of a function in its generated output.

# License

The MIT License (MIT)
