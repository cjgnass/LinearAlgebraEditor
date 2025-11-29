import type { Expression, MatrixLiteral, VectorLiteral, Span } from "./ast";
import React from "react";

type RegisterCaretTarget = (pos: number, el: HTMLElement | null) => void;

export function RenderExpr({ expr }: { expr: Expression }) {
  switch (expr.kind) {
    case "NumberLiteral":
      return <span className="num">{expr.value}</span>;
    case "Identifier":
      return <span className="id">{expr.name}</span>;
    case "BinaryExpression":
      return (
        <span className="binop">
          <RenderExpr expr={expr.left} />
          <span className="op"> {expr.op} </span>
          <RenderExpr expr={expr.right} />
        </span>
      );
    case "Group":
      return (
        <span className="group">
          ( <RenderExpr expr={expr.expr} /> )
        </span>
      );
    case "VectorLiteral":
      return <MatrixLike fromVector={expr} />;
    case "MatrixLiteral":
      return <MatrixLike matrix={expr} />;
    case "Placeholder":
      return <span className="placeholder">□</span>;
    default:
      return <span>?</span>;
  }
}

function MatrixLike({
  matrix,
  fromVector,
}: {
  matrix?: MatrixLiteral;
  fromVector?: VectorLiteral;
}) {
  const rows =
    matrix?.rows ?? (fromVector ? fromVector.elements.map((e) => [e]) : []);
  return (
    <span className="matrix-block">
      <span className="bracket left" aria-hidden="true" />
      <span
        className="matrix-table"
        role="group"
        aria-label={fromVector ? "vector" : "matrix"}
      >
        {rows.map((row, r) => (
          <span key={r} className="matrix-tr">
            {row.map((el, c) => (
              <span key={c} className="matrix-td">
                <RenderExpr expr={el} />
              </span>
            ))}
          </span>
        ))}
      </span>
      <span className="bracket right" aria-hidden="true" />
    </span>
  );
}

function CaretTarget({
  pos,
  registerCaretTarget,
}: {
  pos: number;
  registerCaretTarget?: RegisterCaretTarget;
}) {
  const ref = React.useCallback(
    (el: HTMLSpanElement | null) => {
      registerCaretTarget?.(pos, el);
    },
    [pos, registerCaretTarget],
  );
  return <span className="caret-target" aria-hidden="true" ref={ref} />;
}

// Interactive rendering with caret placement using source spans
export function RenderInteractiveExpr({
  expr,
  text,
  caret,
  registerCaretTarget,
}: {
  expr: Expression;
  text: string;
  caret: number;
  registerCaretTarget?: RegisterCaretTarget;
}) {
  return (
    <>
      <span className="interactive-root">
        {renderNode(expr, text, caret, registerCaretTarget)}
      </span>
    </>
  );
}

function renderNode(
  expr: Expression,
  text: string,
  caret: number,
  registerCaretTarget?: RegisterCaretTarget,
): React.ReactNode {
  switch (expr.kind) {
    case "NumberLiteral":
    case "Identifier":
      return (
        <LeafWithCaret
          text={text}
          span={expr.span}
          caret={caret}
          className={expr.kind === "NumberLiteral" ? "num" : "id"}
          registerCaretTarget={registerCaretTarget}
        />
      );
    case "Placeholder":
      return (
        <PlaceholderWithCaret
          span={expr.span}
          caret={caret}
          registerCaretTarget={registerCaretTarget}
        />
      );
    case "Group": {
      const leftPos = expr.span.start;
      const rightPos = expr.span.end - 1;
      return (
        <span className="group">
          <BracketChar
            pos={leftPos}
            char="("
            caret={caret}
            registerCaretTarget={registerCaretTarget}
          />
          {renderNode(expr.expr, text, caret, registerCaretTarget)}
          <BracketChar
            pos={rightPos}
            char=")"
            caret={caret}
            registerCaretTarget={registerCaretTarget}
          />
        </span>
      );
    }
    case "BinaryExpression": {
      const opNode = <span className="op"> {expr.op} </span>;
      return (
        <span className="binop">
          {renderNode(expr.left, text, caret, registerCaretTarget)}
          {opNode}
          {renderNode(expr.right, text, caret, registerCaretTarget)}
        </span>
      );
    }
    case "VectorLiteral":
      return renderMatrixLike(
        text,
        caret,
        expr.span,
        expr.elements.map((e) => [e]),
        registerCaretTarget,
      );
    case "MatrixLiteral":
      return renderMatrixLike(
        text,
        caret,
        expr.span,
        expr.rows,
        registerCaretTarget,
      );
    default:
      return <span>?</span>;
  }
}

function renderMatrixLike(
  text: string,
  caret: number,
  span: Span,
  rows: Expression[][],
  registerCaretTarget?: RegisterCaretTarget,
) {
  const leftBracketPos = span.start;
  const rightBracketPos = span.end - 1;
  const beforeLeft = caret === leftBracketPos;
  const beforeRight = caret === rightBracketPos;
  const afterRight = caret === rightBracketPos + 1;
  return (
    <span className="matrix-inline">
      {beforeLeft ? <Caret className="caret-before-matrix" /> : null}
      <span className="matrix-block">
        <span className="bracket-slot left">
          <CaretTarget
            pos={leftBracketPos}
            registerCaretTarget={registerCaretTarget}
          />
          <span className="bracket left" aria-hidden="true" />
        </span>
        <span className="matrix-table">
          {rows.length === 0 ? (
            <span className="matrix-tr">
              <span className="matrix-td">
                <CaretTarget
                  pos={leftBracketPos + 1}
                  registerCaretTarget={registerCaretTarget}
                />
                {caret >= leftBracketPos + 1 && caret <= rightBracketPos ? (
                  <Caret />
                ) : (
                  <span className="placeholder">□</span>
                )}
              </span>
            </span>
          ) : null}
          {rows.map((row, r) => (
            <span key={r} className="matrix-tr">
              {row.map((el, c) => (
                <span key={c} className="matrix-td">
                  {renderNode(el, text, caret, registerCaretTarget)}
                </span>
              ))}
            </span>
          ))}
          {/* No default caret before right bracket to avoid phantom new rows */}
        </span>
        <span className="bracket-slot right">
          <CaretTarget
            pos={rightBracketPos}
            registerCaretTarget={registerCaretTarget}
          />
          <span className="bracket right" aria-hidden="true" />
          <CaretTarget
            pos={rightBracketPos + 1}
            registerCaretTarget={registerCaretTarget}
          />
        </span>
      </span>
      {afterRight ? <Caret /> : null}
    </span>
  );
}

function LeafWithCaret({
  text,
  span,
  caret,
  className,
  registerCaretTarget,
}: {
  text: string;
  span: Span;
  caret: number;
  className?: string;
  registerCaretTarget?: RegisterCaretTarget;
}) {
  const s = span.start;
  const e = span.end;
  const content = text.slice(s, e);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i <= content.length; i++) {
    const pos = s + i;
    parts.push(
      <CaretTarget
        key={`t-${pos}`}
        pos={pos}
        registerCaretTarget={registerCaretTarget}
      />,
    );
    if (caret === pos) {
      parts.push(<Caret key={`c-${pos}`} />);
    }
    if (i < content.length) {
      parts.push(
        <React.Fragment key={`ch-${pos}`}>{content[i]}</React.Fragment>,
      );
    }
  }
  return <span className={className}>{parts}</span>;
}

function PlaceholderWithCaret({
  span,
  caret,
  registerCaretTarget,
}: {
  span: Span;
  caret: number;
  registerCaretTarget?: RegisterCaretTarget;
}) {
  // Show caret inside the placeholder if caret is at its end (after a comma/semicolon)
  const before = caret === span.start;
  const atEnd = caret === span.end;
  return (
    <span className="placeholder">
      <CaretTarget pos={span.start} registerCaretTarget={registerCaretTarget} />
      {before ? <Caret /> : null}□
    </span>
  );
}

function BracketChar({
  pos,
  char,
  caret,
  registerCaretTarget,
}: {
  pos: number;
  char: string;
  caret: number;
  registerCaretTarget?: RegisterCaretTarget;
}) {
  // Render char and caret if caret equals the position of this char
  const afterChar = caret === pos + 1;
  return (
    <span>
      <CaretTarget pos={pos} registerCaretTarget={registerCaretTarget} />
      {caret === pos ? <Caret /> : null}
      <span aria-hidden="true">{char}</span>
      <CaretTarget pos={pos + 1} registerCaretTarget={registerCaretTarget} />
      {afterChar ? <Caret /> : null}
    </span>
  );
}

function Caret({ className }: { className?: string }) {
  const cls = className ? `caret ${className}` : "caret";
  return <span className={cls} aria-hidden="true" />;
}
