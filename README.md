# Linear Algebra Editor

A Desmos‑like text editor for linear algebra expressions with live formatting and intent‑based autocomplete (e.g., type `v +` and the next vector slot appears ready to fill).

## Run

- `npm run dev` – Start Vite dev server
- `npm run build` – Type‑check and build
- `npm run preview` – Preview production build
- `npm run lint` – Lint sources

## Initial Roadmap

1) Input Model & Grammar
- Define a minimal grammar and AST for numbers, identifiers, vectors, matrices, and operations (+, −, ×, ·, transpose).
- Choose a lightweight inline syntax (e.g., `[1,2;3,4]` for a 2×2 matrix, `<1,2,3>` for vectors) that converts as you type.

2) Parser & Incremental Updates
- Build a tokenizer + parser that supports partial/incomplete input and produces an AST with placeholders.
- Implement incremental parsing (edit → diff → reparse affected nodes only) for responsiveness.

3) Renderer
- Render the AST to formatted math (MathML/LaTeX via MathLive or custom React components for matrices/vectors).
- Support cursor/selection mapping between text input and rendered math.

4) Pseudo‑Autocomplete & Slots
- From the AST + grammar, predict next expected token(s) and show structured placeholders (e.g., right‑hand vector after `+`).
- Tab/arrow navigation between slots; Enter to confirm structures (e.g., pressing `[` creates a matrix scaffold).

5) Editor Shell
- Create a focused, minimal editor surface with keyboard‑only flow, undo/redo, and basic history.
- Add unit tests around parsing/rendering for key cases (vectors, matrices, chained ops).

6) Performance & Polish
- Avoid full re‑renders; memoize subtrees and measure typing latency.
- Accessibility: ensure MathML fallback and proper ARIA roles for slots.

## Tech Notes

- Stack: React + TypeScript + Vite. For math rendering, consider MathLive for fast, structured math input/formatting, or a custom renderer if deeper control is needed.
- Data Model: Strongly‑typed AST powering both rendering and autocomplete predictions.

---

This repo has been cleaned of template logos and demo UI to provide a clean starting point.
