#!/usr/bin/env node
/* eslint-env node */
/* global process, console */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"

const cwd = process.cwd()
const src = resolve(cwd, "lib")
const dst = resolve(cwd, "dist", "dist", "lib")

if (!existsSync(src)) {
  console.log("copy-lib-to-dist: no lib directory found; skipping")
  process.exit(0)
}

mkdirSync(resolve(cwd, "dist", "dist"), { recursive: true })
rmSync(dst, { recursive: true, force: true })
cpSync(src, dst, { recursive: true })
console.log(`copy-lib-to-dist: copied ${src} -> ${dst}`)
