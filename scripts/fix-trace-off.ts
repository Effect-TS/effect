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

  if (content) {
    let fixedContent = content

    if (!fixedContent.match("// ets_tracing: off")) {
      fixedContent = "// ets_tracing: off\n\n" + fixedContent
    }

    if (fixedContent !== content) {
      fs.writeFileSync(file, fixedContent)
    }
  }
}

files.forEach((file) => {
  fixup(file)
})
