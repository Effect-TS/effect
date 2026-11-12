import { Effect, Schema } from "effect"
import { Component } from "effect/ui"
import { Html } from "effect/ui/html"

/**
 * A stand-in for the popover API, which happy-dom doesn't have. It emulates what the host relies on, as
 * Chromium 153 behaves: `showPopover()` throws on a disconnected element or one without the attribute, and
 * is a no-op when showing; the toggles queued for an element are coalesced into one event in a later task,
 * from the first `oldState` to the latest `newState`; changing the `popover` attribute hides it; and
 * `showModal()` closes the auto popovers showing. `dismiss` is a light dismiss, `run` runs the queued
 * toggle tasks.
 */
export const popoverStub = Effect.acquireRelease(
  Effect.sync(() => {
    const showing = new Set<Element>()
    const calls: Array<string> = []
    const tasks: Array<() => void> = []
    const queued = new Map<Element, { oldState: string; newState: string }>()
    const label = (element: Element) => element.getAttribute("aria-label") ?? element.localName
    const toggle = (element: Element, oldState: string, newState: string) => {
      const pending = queued.get(element)
      if (pending !== undefined) {
        pending.newState = newState
        return
      }
      const states = { oldState, newState }
      queued.set(element, states)
      tasks.push(() => {
        queued.delete(element)
        const event = new Event("toggle")
        Object.defineProperties(event, {
          oldState: { value: states.oldState },
          newState: { value: states.newState }
        })
        element.dispatchEvent(event)
      })
    }
    const hide = (element: Element) => {
      if (!showing.delete(element)) return
      toggle(element, "open", "closed")
    }
    const proto = window.HTMLElement.prototype as any
    const elementProto = window.Element.prototype as any
    const dialogProto = window.HTMLDialogElement.prototype as any
    const original = {
      matches: elementProto.matches,
      setAttribute: elementProto.setAttribute,
      showModal: dialogProto.showModal
    }
    proto.showPopover = function(this: HTMLElement) {
      if (!this.isConnected) throw new DOMException("The popover isn't connected", "InvalidStateError")
      if (!this.hasAttribute("popover")) throw new DOMException("Not a popover", "NotSupportedError")
      if (showing.has(this)) return
      showing.add(this)
      calls.push(`showPopover ${label(this)}`)
      toggle(this, "closed", "open")
    }
    proto.hidePopover = function(this: HTMLElement) {
      if (!showing.has(this)) return
      calls.push(`hidePopover ${label(this)}`)
      hide(this)
    }
    elementProto.matches = function(this: Element, selector: string) {
      return selector === ":popover-open" ? showing.has(this) : original.matches.call(this, selector)
    }
    elementProto.setAttribute = function(this: Element, name: string, value: string) {
      if (name === "popover" && showing.has(this) && this.getAttribute("popover") !== value) hide(this)
      return original.setAttribute.call(this, name, value)
    }
    dialogProto.showModal = function(this: HTMLDialogElement) {
      calls.push(`showModal ${label(this)}`)
      for (const element of Array.from(showing)) {
        if (element.getAttribute("popover") === "auto") hide(element)
      }
      return original.showModal.call(this)
    }
    const restore = () => {
      delete proto.showPopover
      delete proto.hidePopover
      Object.assign(elementProto, { matches: original.matches, setAttribute: original.setAttribute })
      dialogProto.showModal = original.showModal
    }
    return {
      calls,
      dismiss: hide,
      showing,
      run: () => {
        while (tasks.length > 0) tasks.shift()!()
      },
      restore
    }
  }),
  ({ restore }) => Effect.sync(restore)
)

const Mode = Schema.Literals(["manual", "auto"])

export const MenuMessage = Schema.TaggedUnion({
  Set: { open: Schema.Boolean },
  Toggled: { open: Schema.Boolean, newState: Schema.String, oldState: Schema.String },
  Mode: { mode: Mode },
  Remove: {}
})

/** A menu popover. With `follow`, its Model follows the browser's toggles. */
export const Menu = Component.make({
  name: "Menu",
  props: Schema.Struct({ mode: Mode, open: Schema.Boolean, follow: Schema.Boolean }),
  model: Schema.Struct({
    mode: Mode,
    open: Schema.Boolean,
    follow: Schema.Boolean,
    shown: Schema.Boolean,
    log: Schema.Array(Schema.String)
  }),
  message: MenuMessage,
  elements: Html,
  init: ($) => ({ ...$.props, shown: true, log: [] }),
  update: (model, message) =>
    MenuMessage.match(message, {
      Set: ({ open }) => ({ ...model, open }),
      Toggled: ({ newState, oldState, open }) => ({
        ...model,
        open: model.follow ? open : model.open,
        log: [...model.log, `${oldState}->${newState}`]
      }),
      Mode: ({ mode }) => ({ ...model, mode }),
      Remove: () => ({ ...model, shown: false })
    }),
  view: (model, h) =>
    h.div(
      model.shown && h.div(h.button("Rename")).attr("aria-label", "Menu").attr("role", "menu")
        .popover(model.mode, model.open)
        .onToggle(({ newState, oldState, open }) => MenuMessage.make({ _tag: "Toggled", open, newState, oldState }))
    )
})

/** A modal dialog holding an auto popover, both open from the start. */
export const ModalMenu = Component.make({
  name: "ModalMenu",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html,
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.dialog(h.div(h.button("Rename")).attr("aria-label", "Menu").popover("auto", true))
      .attr("aria-label", "Settings").modal(true)
})
