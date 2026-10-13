// How the user started `etest`, so a rerun hint can be pasted as is. Dependency-free on
// purpose: the launcher (bin.ts) sends it along when it forwards a run to `etest serve`.
import * as path from "node:path"

const quote = (s: string) => /^[\w./:@-]+$/.test(s) ? s : JSON.stringify(s)

/**
 * The package script that started this process, as a command to run it again from where it
 * was run (`pnpm --dir packages/test run test`), or `undefined` when it wasn't started through
 * one (or through a package manager other than pnpm or npm). Arguments added to it go to etest.
 */
export const scriptCommand = (env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string | undefined => {
  const script = env.npm_lifecycle_event
  const agent = env.npm_config_user_agent ?? ""
  if (script === undefined) return undefined
  const from = env.INIT_CWD !== undefined ? path.resolve(env.INIT_CWD) : cwd
  const dir = from === path.resolve(cwd) ? undefined : quote(path.relative(from, cwd) || ".")
  if (agent.startsWith("pnpm/")) return `pnpm${dir ? ` --dir ${dir}` : ""} run ${quote(script)}`
  if (agent.startsWith("npm/")) return `npm${dir ? ` --prefix ${dir}` : ""} run ${quote(script)} --`
  return undefined
}
