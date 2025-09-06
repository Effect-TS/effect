import * as Fs from "node:fs"
import * as Path from "node:path"

function packages() {
  const packagesInMain = Fs.readdirSync("packages")
  const packagesInAi = Fs.readdirSync("packages/ai").map((dir) => ({
    name: Path.join("ai", dir),
    basePath: Path.join("packages", "ai", dir)
  }))

  const packagesInNative = Fs.existsSync("packages-native")
    ? Fs.readdirSync("packages-native").map((dir) => ({
      name: Path.join("native", dir), // Safe identifier without ../
      basePath: Path.join("packages-native", dir)
    }))
    : []

  const mainPackages = packagesInMain.map((dir) => ({
    name: dir,
    basePath: Path.join("packages", dir)
  }))

  return [...mainPackages, ...packagesInAi, ...packagesInNative]
    .filter((pkg) => Fs.existsSync(Path.join(pkg.basePath, "docs/modules")))
}

function pkgName(pkg) {
  const packageJson = Fs.readFileSync(Path.join(pkg.basePath, "package.json"))
  return JSON.parse(packageJson).name
}

function copyFiles(pkg) {
  const name = pkgName(pkg)
  const docs = Path.join(pkg.basePath, "docs/modules")
  const dest = Path.join("docs", pkg.name) // Safe: no path traversal possible
  const files = Fs.readdirSync(docs, { withFileTypes: true })

  function handleFiles(root, files) {
    for (const file of files) {
      const path = Path.join(docs, root, file.name)
      const destPath = Path.join(dest, root, file.name)

      if (file.isDirectory()) {
        Fs.mkdirSync(destPath, { recursive: true })
        handleFiles(Path.join(root, file.name), Fs.readdirSync(path, { withFileTypes: true }))
        continue
      }

      const content = Fs.readFileSync(path, "utf8").replace(
        /^parent: Modules$/m,
        `parent: "${name}"`
      )
      Fs.writeFileSync(destPath, content)
    }
  }

  // CRITICAL: Validate dest is within docs/ before deletion
  const resolvedDest = Path.resolve(dest)
  const docsRoot = Path.resolve("docs")
  if (!resolvedDest.startsWith(docsRoot + Path.sep)) {
    throw new Error(`Unsafe deletion target: ${dest} resolves outside docs/`)
  }

  Fs.rmSync(dest, { recursive: true, force: true })
  Fs.mkdirSync(dest, { recursive: true })
  handleFiles("", files)
}

function generateIndex(pkg, order) {
  const name = pkgName(pkg)
  const content = `---
title: "${name}"
has_children: true
permalink: /docs/${pkg.name}
nav_order: ${order}
---
`

  Fs.writeFileSync(Path.join("docs", pkg.name, "index.md"), content)
}

packages().forEach((pkg, i) => {
  const docsModulesPath = Path.join(pkg.basePath, "docs/modules")

  // Only process packages that have docs/modules directory
  if (Fs.existsSync(docsModulesPath)) {
    // CRITICAL: Double-check the target before deletion
    const target = Path.join("docs", pkg.name)
    const resolvedTarget = Path.resolve(target)
    const docsRoot = Path.resolve("docs")

    if (!resolvedTarget.startsWith(docsRoot + Path.sep)) {
      throw new Error(`Unsafe deletion target: ${target} resolves outside docs/`)
    }

    Fs.rmSync(target, { recursive: true, force: true })
    Fs.mkdirSync(target, { recursive: true })
    copyFiles(pkg)
    generateIndex(pkg, i + 2)
  }
})
