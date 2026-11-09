import { BrowserHost } from "@effect/ui-html"
import { Head } from "effect/ui"
import { afterEach, describe, expect, it } from "vitest"

const head = (...entries: ReadonlyArray<Head.Entry>) => Head.merge({ entries, children: [] })

const sync = () => {
  const warnings: Array<string> = []
  const host = BrowserHost.makeHost(document, { warn: (message) => warnings.push(message) })
  hosts.push(host)
  return { apply: host.head!, warnings }
}
const hosts: Array<{ readonly dispose: () => void }> = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.dispose()
  document.head.innerHTML = ""
  document.title = ""
  for (const element of [document.documentElement, document.body]) {
    for (const name of element.getAttributeNames()) element.removeAttribute(name)
  }
})

describe("BrowserHost head", () => {
  it("adopts the server's marked tags, so the first sync changes nothing", () => {
    document.head.innerHTML = `<title>Ada</title><meta name="description" content="About Ada" data-eui>` +
      `<script type="application/ld+json" data-eui>{"name":"Ada"}</script>`
    const meta = document.head.querySelector("meta")!
    const script = document.head.querySelector("script")!
    const { apply } = sync()
    const entries = [
      Head.title("Ada"),
      Head.meta({ name: "description", content: "About Ada" }),
      Head.jsonLd({ name: "Ada" })
    ]
    apply(head(...entries))
    expect(document.head.querySelector("meta")).toBe(meta)
    expect(document.head.querySelector("script")).toBe(script)
    expect(document.head.children.length).toBe(3)

    // A JSON-LD block is rewritten only when its canonical form changes.
    apply(head(...entries.slice(0, 2), Head.jsonLd({ name: "Ada", born: 1815 })))
    expect(document.head.querySelector("script")).not.toBe(script)
    expect(document.head.querySelector("script")!.textContent).toBe("{\"born\":1815,\"name\":\"Ada\"}")
    expect(document.head.querySelector("meta")).toBe(meta)
  })

  it("restores the shell's title, lang and data values and removes owned class tokens", () => {
    document.title = "Shell"
    document.documentElement.setAttribute("lang", "fr")
    document.body.setAttribute("data-theme", "light")
    document.body.className = "shell dark"
    const { apply } = sync()
    apply(head(
      Head.title("App"),
      Head.lang("en"),
      Head.dir("rtl"),
      Head.bodyClass("dark app"),
      Head.bodyData("data-theme", "dark")
    ))
    expect(document.title).toBe("App")
    expect(document.documentElement.getAttribute("lang")).toBe("en")
    expect(document.documentElement.getAttribute("data-eui")).toBe("lang dir")
    expect(document.body.className).toBe("shell dark app")
    expect(document.body.getAttribute("data-eui")).toBe("class data-theme")
    expect(document.body.getAttribute("data-theme")).toBe("dark")

    apply(Head.empty)
    expect(document.title).toBe("Shell")
    expect(document.documentElement.getAttribute("lang")).toBe("fr")
    expect(document.documentElement.hasAttribute("dir")).toBe(false)
    expect(document.documentElement.hasAttribute("data-eui")).toBe(false)
    // "dark" was the framework's once an entry contributed it.
    expect(document.body.className).toBe("shell")
    expect(document.body.getAttribute("data-theme")).toBe("light")
    expect(document.body.hasAttribute("data-eui")).toBe(false)
  })

  it("keeps unmarked shell tags and warns when an entry duplicates one", () => {
    document.head.innerHTML = `<meta name="description" content="Shell"><link rel="canonical" href="/shell">` +
      `<script type="application/ld+json">{}</script>`
    document.documentElement.setAttribute("lang", "fr")
    const { apply, warnings } = sync()
    apply(head(
      Head.meta({ name: "description", content: "App" }),
      Head.link({ rel: "canonical", href: "/app" }),
      Head.jsonLd({ a: 1 }),
      Head.lang("en")
    ))
    expect(warnings.length).toBe(4)
    expect(document.head.querySelectorAll("meta").length).toBe(2)
    apply(Head.empty)
    expect(document.head.querySelector("meta")!.getAttribute("content")).toBe("Shell")
    expect(document.head.querySelectorAll("[data-eui]").length).toBe(0)
  })

  it("warns when an attribute the marker lists doesn't hold the head's value", () => {
    // HTML keeps the first copy of a duplicated attribute, so the shell's class won.
    document.documentElement.setAttribute("class", "h-full")
    document.documentElement.setAttribute("data-eui", "class")
    const { apply, warnings } = sync()
    apply(head(Head.htmlClass("dark")))
    expect(warnings).toEqual(["Head: <html> is missing the class tokens dark the marker lists"])
    expect(document.documentElement.className).toBe("h-full dark")
  })

  it("keeps managed tags in the merged order", () => {
    const { apply } = sync()
    // Stylesheets are where the order matters; happy-dom would try to load one, so these are alternates.
    const sheet = (href: string) => Head.link({ rel: "alternate", href })
    const hrefs = () => [...document.head.querySelectorAll("link[data-eui]")].map((link) => link.getAttribute("href"))
    apply(head(sheet("a.css"), sheet("b.css")))
    expect(hrefs()).toEqual(["a.css", "b.css"])
    const b = document.head.querySelector("link[href='b.css']")
    apply(head(sheet("a2.css"), sheet("b.css")))
    expect(hrefs()).toEqual(["a2.css", "b.css"])
    expect(document.head.querySelector("link[href='b.css']")).toBe(b)
    apply(head(sheet("b.css"), sheet("a2.css"), sheet("c.css")))
    expect(hrefs()).toEqual(["b.css", "a2.css", "c.css"])
    expect(document.head.querySelector("link[href='b.css']")).toBe(b)
  })

  it("warns about a duplicated shell tag whose attribute value holds quotes", () => {
    document.head.innerHTML = `<meta name='say "hi"' content="Shell">`
    const { apply, warnings } = sync()
    apply(head(Head.meta({ name: "say \"hi\"", content: "App" })))
    expect(warnings).toEqual([`Head: the shell has its own meta[name="say \\"hi\\""], which a head entry also sets`])
  })
})
