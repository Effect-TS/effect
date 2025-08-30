#!/usr/bin/env node
/* eslint-env node */
/* global console */
/* global process */
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

function main() {
  const pkgPath = path.join(process.cwd(), "packages-native", "libsqlite", "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const name = pkg.name
  const version = pkg.version

  function npmInfo(tag) {
    try {
      return execSync(`npm view ${name} dist-tags.${tag} --silent`, { encoding: "utf8" }).trim()
    } catch {
      return ""
    }
  }

  function setTag(tag, v) {
    execSync(`npm dist-tag add ${name}@${v} ${tag}`, { stdio: "inherit" })
  }

  const current = npmInfo("latest")
  if (current !== version) {
    console.log(`Setting dist-tag 'latest' to ${name}@${version} (was: ${current || "unset"})`)
    setTag("latest", version)
  } else {
    console.log(`'latest' already points to ${name}@${version}`)
  }
}

main()
