/** @jsxImportSource @effect-native/patterns */

import { jsx } from "@effect-native/patterns/jsx-runtime"
import { Fragment, jsxDEV } from "@effect-native/patterns/jsx-dev-runtime"
import { assert, describe, it } from "@effect/vitest"

const REACT_ELEMENT_TYPE = Symbol.for("react.element")

interface ReactElement {
  readonly $$typeof: symbol
  readonly type: unknown
  readonly key: string | null
  readonly ref: unknown
  readonly props: Record<string, unknown>
  readonly _owner: unknown
}

describe("jsx runtime", () => {
  it("builds Tree structures for intrinsic elements", () => {
    const reminders = (
      <reminders tz="America/New_York">
        <list name="Home">
          <reminder title="Take out trash" due="2025-08-10T20:00" priority="low">
            <alarm offset="-PT10M" />
            <tag name="chore" />
          </reminder>
        </list>
      </reminders>
    ) as ReactElement

    assert.strictEqual(reminders.$$typeof, REACT_ELEMENT_TYPE)
    assert.strictEqual(reminders.type, "reminders")
    assert.strictEqual(reminders.key, null)
    assert.strictEqual(reminders.ref, null)
    assert.strictEqual(reminders.props.tz, "America/New_York")
    const listChildren = Array.isArray(reminders.props.children)
      ? reminders.props.children
      : [reminders.props.children]
    const [listElement] = listChildren as Array<ReactElement>
    assert.isTrue(listElement !== undefined)
    assert.strictEqual(listElement.type, "list")
    assert.strictEqual(listElement.props.name, "Home")
    const reminderChildren = Array.isArray(listElement.props.children)
      ? listElement.props.children
      : [listElement.props.children]
    const [reminderElement] = reminderChildren as Array<ReactElement>
    assert.isTrue(reminderElement !== undefined)
    assert.strictEqual(reminderElement.type, "reminder")
    assert.strictEqual(reminderElement.props.title, "Take out trash")
    assert.strictEqual(reminderElement.props.due, "2025-08-10T20:00")
    assert.strictEqual(reminderElement.props.priority, "low")
    const reminderGrandChildren = Array.isArray(reminderElement.props.children)
      ? reminderElement.props.children
      : [reminderElement.props.children]
    const [alarmElement, tagElement] = reminderGrandChildren as Array<ReactElement>
    assert.strictEqual(alarmElement.type, "alarm")
    assert.deepStrictEqual(alarmElement.props, { offset: "-PT10M" })
    assert.strictEqual(tagElement.type, "tag")
    assert.deepStrictEqual(tagElement.props, { name: "chore" })
  })

  it("supports Fragment and jsxDEV metadata", () => {
    const element = jsxDEV(
      Fragment,
      { children: [jsx("div", { id: "a" }, undefined)] },
      "my-key",
      false,
      { fileName: "example.tsx", lineNumber: 12, columnNumber: 5 },
      { current: "owner" }
    ) as ReactElement & { readonly _store?: { validated?: boolean }; readonly _source?: unknown }

    assert.strictEqual(element.$$typeof, REACT_ELEMENT_TYPE)
    assert.strictEqual(element.type, Fragment)
    assert.strictEqual(element.key, "my-key")
    assert.strictEqual(element.ref, null)
    assert.isTrue(Array.isArray(element.props.children))
    const [child] = element.props.children as Array<ReactElement>
    assert.strictEqual(child.$$typeof, REACT_ELEMENT_TYPE)
    assert.strictEqual(child.type, "div")
    assert.strictEqual(child.key, null)
    assert.strictEqual(child.ref, null)
    assert.deepStrictEqual(child.props, { id: "a" })
    assert.strictEqual(child._owner, null)
    assert.strictEqual(element._store, undefined)
    assert.deepStrictEqual(element._source, {
      fileName: "example.tsx",
      lineNumber: 12,
      columnNumber: 5
    })
    assert.deepStrictEqual(element._owner, { current: "owner" })
  })
})
