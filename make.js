import * as fs from "fs"

const excludes = ["index.ts", "internal"]
const f = () => {
  fs.readdirSync("./src")
    .filter((_) => !excludes.includes(_) && !/\.(int|impl)\./.test(_) && !_.startsWith("."))
    .forEach((file) => {
      fs.writeFileSync(
        `./src/internal/Jumpers/${file}`,
        `export * as ${file.substring(0, file.length - 3)} from "../../${file.substring(0, file.length - 3)}.impl.js"\n`
      )
    })
}

f()
