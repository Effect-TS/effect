import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

export async function withGeneratedModule<Module>(
  source: string,
  use: (module: Module) => void | Promise<void>
): Promise<void> {
  const directory = mkdtempSync(join(import.meta.dirname, ".generated-module-"))
  try {
    const file = join(directory, "module.ts")
    writeFileSync(file, source)
    const module: Module = await import(pathToFileURL(file).href)
    await use(module)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
