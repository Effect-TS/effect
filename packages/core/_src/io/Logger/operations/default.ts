/**
 * @tsplus static effect/core/io/Logger.Ops default
 */
export const defaultLogger: Logger<string, string> = {
  apply: (fiberId, logLevel, message, cause0, context, spans, annotations) => {
    const cause = cause0()
    const now = new Date()
    const nowMillis = now.getTime()

    let output = [
      `timestamp=${now.toISOString()}`,
      ` level=${logLevel.label}`,
      ` thread=#${fiberId.threadName}`,
      ` message="${message()}"`
    ].join("")

    if (cause != null && cause != Cause.empty) {
      // TODO(Mike/Max): implement once tracing is complete
      // output = output + ` cause="${cause.prettyPrint()}"`
    }

    if (spans.length > 0) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + span.render(nowMillis)
      }
    }

    if (annotations.size > 0) {
      output = output + " "

      let first = true
      for (const { tuple: [key, value] } of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = appendQuoted(key, output)
        output = output + "="
        output = appendQuoted(value, output)
      }
    }

    return output
  }
}

function appendQuoted(label: string, output: string): string {
  if (label.indexOf(" ") < 0) {
    return output + label
  } else {
    return output + `"${label}"`
  }
}
