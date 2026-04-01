# Planning System — Quick Reference

Two files. One loaded upfront, one loaded when you're ready to build.

---

## The Files

| File | Purpose | When to use it |
|---|---|---|
| `planning-prompt.md` | System prompt — drives the discovery process | Paste into Opus at session start |
| `planning-templates.md` | Template library — all document formats and standard blocks | Paste into the chat when Opus asks for it |

---

## How to Run a Planning Session

**1. Start the session**
Open a new Opus chat. Paste the full contents of `planning-prompt.md` as your first message (or as the system prompt if your interface supports it).

**2. Answer questions**
Opus will introduce itself and begin discovery — one question at a time. Answer each one. It will run an assumptions audit before touching any documents.

**3. Confirm the plan**
Opus will present the full list of documents and phase sequence for your approval. Adjust anything before giving the go-ahead.

**4. Load the templates**
When Opus says it's ready to generate documents, paste the full contents of `planning-templates.md` into the chat. This gives it the exact formats, standard blocks, and shared patterns to use.

**5. Receive your planning suite**
Opus generates each document as a separate artifact in the correct order, ending with `CURSOR_PROMPTS.md`.

---

## Why Two Files

`planning-prompt.md` is lean by design — it only contains the process logic and quality standards. This keeps token cost low during the discovery phase, which is most of the conversation.

`planning-templates.md` is the heavyweight file with all verbatim templates, standard code blocks, and shared patterns. It enters context once, at the moment documents are generated, then it's done.

**Discovery phase cost**: ~8.7K characters
**Full session cost**: ~37K characters (vs. 50K with the original single file)
