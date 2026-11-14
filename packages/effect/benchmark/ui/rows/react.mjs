// The same keyed table as entry.ts, on React (react-dom/client, production build). run.mjs bundles it
// separately, so a React page loads no effect code. JavaScript rather than TypeScript: `pnpm check`
// type checks benchmarks from packages/effect, which has no React types.
//
// Variants, rendering the DOM described in harness.ts:
//
//   react-plain      every row is plain elements in the table's own render: one component in total,
//                    as effect/ui's `plain`. Every update renders every row.
//   react-component  a Row component per row, not memoized: every update renders every row. The
//                    unmemoized baseline.
//   react-memo       a Row component per row under React.memo, given `dispatch` (stable), so a row
//                    renders only when its props change. Idiomatic React, as in
//                    js-framework-benchmark's react-hooks entry, and the counterpart of effect/ui's
//                    `component`, which skips rows whose props are equal.
//
// `send` dispatches inside flushSync, so the update renders and commits before it returns: React's
// default for an update from outside an event is a scheduler task, which the harness's
// first-microtask boundary would fail. Clicks go through React's own event handling, unchanged.
import { createElement as e, memo, useReducer } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { init, install, update } from "./harness.ts"

const Cells = ({ row, dispatch }) => [
  e("td", { key: "id", className: "col-md-1" }, String(row.id)),
  e(
    "td",
    { key: "label", className: "col-md-4" },
    e("a", { onClick: () => dispatch({ _tag: "Select", id: row.id }) }, row.label)
  ),
  e(
    "td",
    { key: "remove", className: "col-md-1" },
    e(
      "a",
      { onClick: () => dispatch({ _tag: "Remove", id: row.id }) },
      e("span", { className: "glyphicon glyphicon-remove", "aria-hidden": "true" })
    )
  ),
  e("td", { key: "pad", className: "col-md-6" })
]

const Row = ({ row, selected, dispatch }) =>
  e("tr", { className: selected ? "danger" : undefined }, Cells({ row, dispatch }))
const MemoRow = memo(Row)

const table = (rows) => e("table", { className: "table" }, e("tbody", null, rows))

const Plain = ({ bind }) => {
  const [model, dispatch] = useReducer(update, undefined, init)
  bind(dispatch)
  return table(model.rows.map((row) =>
    e(
      "tr",
      { key: row.id, className: row.id === model.selected ? "danger" : undefined },
      Cells({ row, dispatch })
    )
  ))
}

const withRow = (component) => ({ bind }) => {
  const [model, dispatch] = useReducer(update, undefined, init)
  bind(dispatch)
  return table(model.rows.map((row) =>
    e(component, { key: row.id, row, selected: row.id === model.selected, dispatch })
  ))
}

const mount = (App) => async (container) => {
  let dispatch
  const root = createRoot(container)
  flushSync(() => root.render(e(App, { bind: (d) => (dispatch = d) })))
  return {
    send: (message) => flushSync(() => dispatch(message)),
    close: async () => root.unmount()
  }
}

install({
  "react-plain": mount(Plain),
  "react-component": mount(withRow(Row)),
  "react-memo": mount(withRow(MemoRow))
})
