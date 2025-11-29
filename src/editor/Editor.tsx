import React, { useMemo, useRef, useState } from "react";
import { lex } from "./lexer";
import { parse } from "./parser";
import { RenderExpr, RenderInteractiveExpr } from "./renderer";
import { simplify } from "./eval";
import "./editor.css";

export default function Editor() {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const caretTargets = useRef<{ pos: number; el: HTMLElement }[]>([]);

  const registerCaretTarget = React.useCallback(
    (pos: number, el: HTMLElement | null) => {
      if (!el) return;
      caretTargets.current.push({ pos, el });
    },
    [],
  );

  const pickCaretFromClick = React.useCallback(
    (clientX: number, clientY: number) => {
      let best: { pos: number; dist: number } | null = null;
      console.log(caretTargets.current);
      for (const target of caretTargets.current) {
        const rect = target.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = dx * dx + dy * dy;
        if (!best || dist < best.dist) {
          console.log("bruh");
          best = { pos: target.pos, dist };
        }
      }
      // console.log("best", best);
      return best ? best.pos : null;
    },
    [],
  );

  const { expr, errors } = useMemo(() => {
    const toks = lex(text);
    return parse(toks);
  }, [text]);

  const simplified = useMemo(() => simplify(expr), [expr]);

  const applyChange = (rawText: string, rawCursor: number) => {
    const before = rawText.slice(0, rawCursor);
    const after = rawText.slice(rawCursor);
    const beforeClean = before.replace(/\s+/g, "");
    const afterClean = after.replace(/\s+/g, "");
    const clean = beforeClean + afterClean;
    setText(clean);
    setCursor(Math.max(0, Math.min(clean.length, beforeClean.length)));
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    // Auto-close vector/matrix and place caret inside
    if (k === "<") {
      e.preventDefault();
      const insert = "<>";
      const newText = text.slice(0, cursor) + insert + text.slice(cursor);
      applyChange(newText, cursor + 1);
      return;
    }
    if (k === "[") {
      e.preventDefault();
      const insert = "[]";
      const newText = text.slice(0, cursor) + insert + text.slice(cursor);
      applyChange(newText, cursor + 1);
      return;
    }
    // Skip over existing auto-closed brackets
    if ((k === ">" || k === "]") && text[cursor] === k) {
      e.preventDefault();
      setCursor(cursor + 1);
      return;
    }
    if (k === "Backspace") {
      e.preventDefault();
      if (cursor > 0) {
        const newText = text.slice(0, cursor - 1) + text.slice(cursor);
        applyChange(newText, cursor - 1);
      }
      return;
    }
    if (k === "Delete") {
      e.preventDefault();
      if (cursor < text.length) {
        const newText = text.slice(0, cursor) + text.slice(cursor + 1);
        applyChange(newText, cursor);
      }
      return;
    }
    if (k === "ArrowLeft") {
      e.preventDefault();
      setCursor(Math.max(0, cursor - 1));
      return;
    }
    if (k === "ArrowRight") {
      e.preventDefault();
      setCursor(Math.min(text.length, cursor + 1));
      return;
    }
    if (k === "Home") {
      e.preventDefault();
      setCursor(0);
      return;
    }
    if (k === "End") {
      e.preventDefault();
      setCursor(text.length);
      return;
    }
    if (k.length === 1 && !e.isComposing) {
      e.preventDefault();
      if (/\s/.test(k)) return;
      const ch = k;
      const newText = text.slice(0, cursor) + ch + text.slice(cursor);
      applyChange(newText, cursor + ch.length);
      return;
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    // console.log(caretTargets.current.length);
    boxRef.current?.focus();
    const pos = pickCaretFromClick(e.clientX, e.clientY);
    if (pos !== null) {
      setCursor(Math.max(0, Math.min(text.length, pos)));
    }
  }

  return (
    <div className="editor-wrap">
      <div className="panes">
        <div className="preview">
          <div
            className="expr-box"
            role="textbox"
            tabIndex={0}
            ref={boxRef}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onFocus={() =>
              setCursor((c) => Math.max(0, Math.min(text.length, c)))
            }
          >
            <RenderInteractiveExpr
              expr={expr}
              text={text}
              caret={cursor}
              registerCaretTarget={registerCaretTarget}
            />
          </div>
          <div className="result-box">
            <RenderExpr expr={simplified} />
          </div>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((e, i) => (
            <div key={i}>⚠︎ {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
