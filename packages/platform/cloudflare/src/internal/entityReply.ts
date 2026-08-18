/** @internal */
import * as Context from "effect/Context"

/** @internal */
export const CurrentEntityName = Context.Reference<string | undefined>(
  "@effect/platform-cloudflare/CurrentEntityName",
  { defaultValue: () => undefined }
)

type ReplyHandler = (reply: string) => Promise<void>

const handlers = new Map<string, Set<ReplyHandler>>()

/** @internal */
export const registerReplyHandler = (requestId: string, handler: ReplyHandler): void => {
  const registered = handlers.get(requestId) ?? new Set()
  registered.add(handler)
  handlers.set(requestId, registered)
}

/** @internal */
export const unregisterReplyHandler = (requestId: string, handler?: ReplyHandler): void => {
  if (handler === undefined) {
    handlers.delete(requestId)
    return
  }
  const registered = handlers.get(requestId)
  if (registered === undefined) return
  registered.delete(handler)
  if (registered.size === 0) handlers.delete(requestId)
}

/** @internal */
export const deliverReply = async (requestId: string, reply: string): Promise<boolean> => {
  const registered = handlers.get(requestId)
  if (registered === undefined) return false
  handlers.delete(requestId)
  await Promise.all(Array.from(registered, (handler) => handler(reply)))
  return true
}
