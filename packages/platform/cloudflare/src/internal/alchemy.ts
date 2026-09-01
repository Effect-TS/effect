import { Names } from "../CloudflareBindings.ts"

export interface SingletonTrigger {
  readonly cron: string
  readonly names: ReadonlyArray<string>
}

export const assertNoReservedBindings = (env: object | undefined): void => {
  if (env === undefined) return
  for (const name of Object.values(Names)) {
    if (Object.hasOwn(env, name)) {
      throw new Error(`CloudflareAlchemy.worker: env binding "${name}" is reserved by Effect Cluster`)
    }
  }
}

export const makeSingletonTriggers = (
  crons: ReadonlyArray<string> | undefined,
  triggers: ReadonlyArray<SingletonTrigger>
): {
  readonly crons: Array<string>
  readonly triggerMap: Record<string, Array<string>>
} => {
  const triggerMap: Record<string, Array<string>> = {}
  for (const trigger of triggers) {
    const names = triggerMap[trigger.cron] ?? (triggerMap[trigger.cron] = [])
    for (const name of trigger.names) {
      if (!names.includes(name)) names.push(name)
    }
  }
  return {
    crons: Array.from(new Set([...(crons ?? []), ...Object.keys(triggerMap)])),
    triggerMap
  }
}
