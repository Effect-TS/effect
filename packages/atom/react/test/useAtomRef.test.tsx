import { useAtomRef } from "@effect/atom-react"
import { assert } from "@effect/vitest"
import { act, render } from "@testing-library/react"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"
import * as React from "react"
import { describe, it } from "vitest"

describe.sequential("useAtomRef", () => {
  it.each([0, 2])("renders a switched ref's next value %i", (next) => {
    const first = AtomRef.make(0)
    const second = AtomRef.make(1)

    function Value({ source }: { readonly source: AtomRef.ReadonlyRef<number> }) {
      return <div>{useAtomRef(source)}</div>
    }

    const { container, rerender } = render(<Value source={first} />)
    assert.strictEqual(container.textContent, "0")

    rerender(<Value source={second} />)
    assert.strictEqual(container.textContent, "1")

    act(() => {
      second.set(next)
    })
    assert.strictEqual(second.value, next)
    assert.strictEqual(container.textContent, String(next))
  })

  it("shows the switched ref's initial value and detaches the old ref", () => {
    const first = AtomRef.make(0)
    const second = AtomRef.make(1)
    const rendered: Array<number> = []

    function Value({ source }: { readonly source: AtomRef.ReadonlyRef<number> }) {
      const value = useAtomRef(source)
      rendered.push(value)
      return <div>{value}</div>
    }

    const { container, rerender } = render(<Value source={first} />)
    rerender(<Value source={second} />)
    assert.strictEqual(container.textContent, "1")
    const before = rendered.slice()

    act(() => {
      first.set(3)
    })
    assert.deepStrictEqual(rendered, before)
    assert.strictEqual(container.textContent, "1")
  })

  it("keeps the subscription across rerenders and releases it on unmount", () => {
    const ref = AtomRef.make(0)
    const reads: Array<number> = []
    const source = ref.map((value) => {
      reads.push(value)
      return value
    })

    function Value() {
      return <div>{useAtomRef(source)}</div>
    }

    const { container, rerender, unmount } = render(<Value />)
    rerender(<Value />)
    act(() => {
      ref.set(1)
    })
    assert.strictEqual(container.textContent, "1")

    unmount()
    const before = reads.slice()
    act(() => {
      ref.set(2)
    })
    assert.deepStrictEqual(reads, before)
  })
})
