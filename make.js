import * as fs from "fs"

const excludes = ["index.ts", "internal"]
const f = () => {
  fs.readdirSync("./src")
    .filter((_) => !excludes.includes(_) && !/\.(int|impl)\./.test(_) && !_.startsWith("."))
    .forEach((file) => {
      const fileWithoutExt = file.substring(0, file.length - 3)
      if (fs.existsSync(`./src/${fileWithoutExt}.impl.ts`)) return
      const int = `${fileWithoutExt}.int.ts`
      const intExists = fs.existsSync(`./src/${int}`)
      const src = intExists ? int : file
      fs.copyFileSync(`./src/${src}`, `./src/${fileWithoutExt}.impl.ts`)
      if (intExists) fs.rmSync(`./src/${int}`)
      fs.writeFileSync(
        `./src/${file}`,
        `export * from "./${fileWithoutExt}.impl.js"\nexport * from "./internal/Jumpers/${fileWithoutExt}.js"\n`,
        { encoding: "utf8", flag: "w" }
      )
      fs.writeFileSync(
        `./src/internal/Jumpers/${file}`,
        `export * as ${fileWithoutExt} from "../../${fileWithoutExt}.impl.js"\n`,
        { encoding: "utf8", flag: "w" }
      )
    })
}

f()
