---
"effect": patch
---

Type `String.replace`, `String.replaceAll`, `String.matchAll`, `String.localeCompare`, `String.toLocaleLowerCase` and `String.toLocaleUpperCase` as the native methods they forward to: `replace` and `replaceAll` accept a replacer function, `matchAll` yields `RegExpExecArray` matches whose `index` and `input` are always present, and the locale arguments accept any `Intl.LocalesArgument`, such as a single locale, a readonly list or an `Intl.Locale`.
