import * as Error from "../../sql/SqlError.ts"

/** @internal */
export const failure = (cause: unknown, operation: string, connection = false): Error.SqlError => {
  const detail = cause as { number?: number; message?: string }
  const props = { cause, operation, message: detail?.message ?? String(cause) }
  let reason: Error.SqlError["reason"]
  switch (detail?.number) {
    case 233:
    case 10054:
      reason = new Error.ConnectionError(props)
      break
    case 4060:
    case 18452:
    case 18456:
      reason = new Error.AuthenticationError(props)
      break
    case 229:
    case 230:
    case 262:
    case 297:
    case 300:
      reason = new Error.AuthorizationError(props)
      break
    case 102:
    case 207:
    case 208:
    case 2714:
      reason = new Error.SqlSyntaxError(props)
      break
    case 2601:
    case 2627: {
      const match = /(?:constraint|unique index)\s+'([^']+)'/i.exec(props.message)
      reason = new Error.UniqueViolation({ ...props, constraint: match?.[1] ?? "unknown" })
      break
    }
    case 515:
    case 547:
      reason = new Error.ConstraintError(props)
      break
    case 1205:
      reason = new Error.DeadlockError(props)
      break
    case 1222:
      reason = new Error.LockTimeoutError(props)
      break
    case 3960:
      reason = new Error.SerializationError(props)
      break
    default:
      reason = connection ? new Error.ConnectionError(props) : new Error.UnknownError(props)
  }
  return new Error.SqlError({ reason })
}
