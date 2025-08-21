import type { Graph } from "../../Graph.js"
import * as internal from "./graph.js"

const defaultDotConfig = {
  edgeIndexLabel: false,
  edgeNoLabel: false,
  graphContentOnly: false,
  nodeIndexLabel: false,
  nodeNoLabel: false
}

/** @internal */
export const toDot = (
  self: Graph.Any,
  config?: {
    readonly nodeIndexLabel?: boolean | undefined
    readonly edgeIndexLabel?: boolean | undefined
    readonly edgeNoLabel?: boolean | undefined
    readonly nodeNoLabel?: boolean | undefined
    readonly graphContentOnly?: boolean | undefined
  } | undefined
): string => {
  const {
    edgeIndexLabel,
    edgeNoLabel,
    graphContentOnly,
    nodeIndexLabel,
    nodeNoLabel
  } = Object.assign({}, defaultDotConfig, config)

  const indent = "    "
  const lines: Array<string> = []
  const type = internal.isDirected(self) ? "digraph" : "graph"
  const op = internal.isDirected(self) ? "->" : "--"

  if (!graphContentOnly) {
    lines.push(`${type} {`)
  }

  for (const [index, data] of internal.nodes(self)) {
    let line = `${indent}${index} [ `
    if (!nodeNoLabel) {
      const label = nodeIndexLabel ? `${index}` : escapeLabel(String(data))
      line += `label = "${label}" `
    }
    lines.push(`${line}]`)
  }

  for (const [index, data] of internal.edges(self)) {
    const edge = self.edges[index]
    const [from, to] = edge.node
    let line = `${indent}${from} ${op} ${to} [ `
    if (!edgeNoLabel) {
      const label = edgeIndexLabel ? `${index}` : escapeLabel(String(data))
      line += `label = "${label}" `
    }
    lines.push(`${line}]`)
  }

  if (!graphContentOnly) {
    lines.push("}")
  }

  return lines.join("\n") + "\n"
}

const escapeLabel = (str: string): string => str.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\l")
