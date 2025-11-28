import type { Expression, MatrixLiteral, VectorLiteral, Span } from './ast'
import React from 'react'

export function RenderExpr({ expr }: { expr: Expression }) {
  switch (expr.kind) {
    case 'NumberLiteral':
      return <span className="num">{expr.value}</span>
    case 'Identifier':
      return <span className="id">{expr.name}</span>
    case 'BinaryExpression':
      return (
        <span className="binop">
          <RenderExpr expr={expr.left} />
          <span className="op"> {expr.op} </span>
          <RenderExpr expr={expr.right} />
        </span>
      )
    case 'Group':
      return (
        <span className="group">( <RenderExpr expr={expr.expr} /> )</span>
      )
    case 'VectorLiteral':
      return <MatrixLike fromVector={expr} />
    case 'MatrixLiteral':
      return <MatrixLike matrix={expr} />
    case 'Placeholder':
      return <span className="placeholder">□</span>
    default:
      return <span>?</span>
  }
}

function MatrixLike({ matrix, fromVector }: { matrix?: MatrixLiteral; fromVector?: VectorLiteral }) {
  const rows = matrix?.rows ?? (fromVector ? fromVector.elements.map((e) => [e]) : [])
  return (
    <span className="matrix-block">
      <span className="bracket left" aria-hidden="true" />
      <span className="matrix-table" role="group" aria-label={fromVector ? 'vector' : 'matrix'}>
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
  )
}

// Interactive rendering with caret placement using source spans
export function RenderInteractiveExpr({ expr, text, caret }: { expr: Expression; text: string; caret: number }) {
  return <span className="interactive-root">{renderNode(expr, text, caret)}</span>
}

function renderNode(expr: Expression, text: string, caret: number): React.ReactNode {
  switch (expr.kind) {
    case 'NumberLiteral':
    case 'Identifier':
      return <LeafWithCaret text={text} span={expr.span} caret={caret} className={expr.kind === 'NumberLiteral' ? 'num' : 'id'} />
    case 'Placeholder':
      return <PlaceholderWithCaret span={expr.span} caret={caret} />
    case 'Group': {
      const leftPos = expr.span.start
      const rightPos = expr.span.end - 1
      return (
        <span className="group">
          <BracketChar pos={leftPos} char="(" caret={caret} />
          {renderNode(expr.expr, text, caret)}
          <BracketChar pos={rightPos} char=")" caret={caret} />
        </span>
      )
    }
    case 'BinaryExpression': {
      const opNode = (
        <span className="op"> {expr.op} </span>
      )
      return (
        <span className="binop">
          {renderNode(expr.left, text, caret)}
          {opNode}
          {renderNode(expr.right, text, caret)}
        </span>
      )
    }
    case 'VectorLiteral':
      return renderMatrixLike(text, caret, expr.span, expr.elements.map((e) => [e]))
    case 'MatrixLiteral':
      return renderMatrixLike(text, caret, expr.span, expr.rows)
    default:
      return <span>?</span>
  }
}

function renderMatrixLike(text: string, caret: number, span: Span, rows: Expression[][]) {
  const leftBracketPos = span.start
  const rightBracketPos = span.end - 1
  return (
    <span className="matrix-block">
      <span className="bracket left" aria-hidden="true" />
      <span className="matrix-table">
        {rows.length === 0 ? (
          <span className="matrix-tr">
            <span className="matrix-td">
              {caret >= leftBracketPos + 1 && caret <= rightBracketPos ? <Caret /> : <span className="placeholder">□</span>}
            </span>
          </span>
        ) : null}
        {rows.map((row, r) => (
          <span key={r} className="matrix-tr">
            {row.map((el, c) => (
              <span key={c} className="matrix-td">
                {renderNode(el, text, caret)}
              </span>
            ))}
          </span>
        ))}
        {/* No default caret before right bracket to avoid phantom new rows */}
      </span>
      <span className="bracket right" aria-hidden="true" />
    </span>
  )
}

function LeafWithCaret({ text, span, caret, className }: { text: string; span: Span; caret: number; className?: string }) {
  const s = span.start
  const e = span.end
  const content = text.slice(s, e)
  const offset = caret - s
  if (offset <= 0 || offset >= content.length) {
    return (
      <span className={className}>
        {caret === s ? <Caret /> : null}
        {content}
        {caret === e ? <Caret /> : null}
      </span>
    )
  }
  return (
    <span className={className}>
      {content.slice(0, offset)}
      <Caret />
      {content.slice(offset)}
    </span>
  )
}

function PlaceholderWithCaret({ span, caret }: { span: Span; caret: number }) {
  // Show caret inside the placeholder if caret is at its end (after a comma/semicolon)
  const atEnd = caret === span.end
  return (
    <span className="placeholder">
      {atEnd ? <Caret /> : null}
      □
    </span>
  )
}

function BracketChar({ pos, char, caret }: { pos: number; char: string; caret: number }) {
  // Render char and caret if caret equals the position of this char
  return (
    <span>
      {caret === pos ? <Caret /> : null}
      <span aria-hidden="true">{char}</span>
    </span>
  )
}

function Caret() {
  return <span className="caret" aria-hidden="true" />
}
