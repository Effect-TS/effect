/* eslint-disable no-undef */
import * as glob from "glob"
import madge from "madge"

madge(
  glob.globSync("packages/*/src/**/*.ts", {
    ignore: ["packages/sql-sqlite-bun/**"]
  }),
  {
    detectiveOptions: {
      ts: {
        skipTypeImports: true
      }
    }
  }
).then((res) => {
  const circular = res.circular()
  if (circular.length) {
    console.error("Circular dependencies found")
    console.error(circular)
    process.exit(1)
  }
})
