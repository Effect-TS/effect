import * as fs from "fs"
import * as path from "path"

const getAllFiles = function (dirPath: string, input?: string[]) {
  const files = fs.readdirSync(dirPath)

  let arrayOfFiles = input || []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(__dirname, dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

const files = getAllFiles("./src")

const fixup = (file: string) => {
  const content = fs.readFileSync(file).toString("utf-8")
  const lines = content.split("\n")

  if (content) {
    const fixed = lines.map((line) => {
      const res = line.match(/(import|export|from|declare module).*"(.*)"/)
      if (res) {
        const [, , relative] = res
        if (relative?.startsWith(".")) {
          const indexPath = path.join(file, "..", relative) + "/index.ts"
          const filePath = path.join(file, "..", relative) + ".ts"
          if (fs.existsSync(filePath)) {
            return line.replace(relative, relative + ".js")
          }
          if (fs.existsSync(indexPath)) {
            return line.replace(relative, relative + "/index.js")
          }
        }
      }

      return line
    })

    const fixedContent = fixed.join("\n")

    if (fixedContent !== content) {
      fs.writeFileSync(file, fixedContent)
    }
  }
}

files.forEach((file) => {
  fixup(file)
})
