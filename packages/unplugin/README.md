# @effect/unplugin

Universal bundler plugin for Effect transformations.

## Installation

```bash
npm install @effect/unplugin
```

## Usage

### Vite

```typescript
// vite.config.ts
import effectPlugin from "@effect/unplugin/vite"

export default {
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
}
```

### Rollup

```typescript
// rollup.config.js
import effectPlugin from "@effect/unplugin/rollup"

export default {
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
}
```

### Webpack

```javascript
// webpack.config.js
const effectPlugin = require("@effect/unplugin/webpack").default

module.exports = {
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
}
```

### esbuild

```typescript
import * as esbuild from "esbuild"
import effectPlugin from "@effect/unplugin/esbuild"

await esbuild.build({
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
})
```

### Rspack

```javascript
// rspack.config.js
const effectPlugin = require("@effect/unplugin/rspack").default

module.exports = {
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
}
```

## Options

- `sourceTrace` (boolean, default: `true`) - Enable source trace injection into Effect.gen yields
- `annotateEffects` (boolean, default: `false`) - Enable @__PURE__ annotations for tree-shaking
- `include` (string[], default: `["**/*.ts", "**/*.tsx"]`) - Glob patterns to include
- `exclude` (string[], default: `["**/node_modules/**", "**/*.d.ts"]`) - Glob patterns to exclude
