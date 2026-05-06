---
"@effect/sql-sqlite-node-sqlite": major
---

This new adapter leverages the built-in `DatabaseSync` API available in Node.js 22.x+ and Deno 2.x+. It provides a lightweight, synchronous SQL client without relying on native C++ build tools like `node-gyp`.

**Features:**
- Seamless compatibility with Deno and modern Node.js environments.
- Zero external native dependencies, simplifying the installation and deployment process.
