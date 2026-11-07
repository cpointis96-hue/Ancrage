---
name: scope-locked-ui
description: Preserve exact user scope when editing this project's UI or visible copy. Use for any cockpit, page, component, label, status, metadata, or responsive change where unsolicited detail or redundant chrome would create noise.
---

# Scope-locked UI

Treat the user's request as an allow-list for visible content.

- Do not add labels, explanations, examples, counts, model names, versions, environments, provenance notes, subtitles, or metadata unless the user explicitly requests them or they are required to complete the named action.
- Before adding visible text, identify the concrete decision or action it enables. If none, omit it.
- Never repeat a page title in an eyebrow, kicker, breadcrumb, subtitle, or adjacent panel.
- Keep cockpit headers to one title and the actions needed in that context.
- Represent PASS, WARN, and BLOCK states as accessible green, orange, and red dots. Keep the status name in `aria-label` or `title`, not as visible chrome, unless the user asks for text.
- Preserve approved content and behavior outside the requested scope. Do not “improve” copy or expose implementation detail on your own initiative.
- Validate every cockpit navigation destination at desktop, tablet, and 390 px. Header actions must remain visible, text must wrap inside its container, and `scrollWidth` must not exceed the viewport.

Before delivery, inspect every visible string added by the diff. Remove any string that is neither requested nor operationally necessary.
