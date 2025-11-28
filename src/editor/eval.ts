import type { Expression, NumberLiteral, VectorLiteral, MatrixLiteral, BinaryExpression, Group, Placeholder, Span } from './ast'

const spanOf = (a: Expression, b?: Expression): Span => ({
  start: a.span.start,
  end: (b ?? a).span.end,
})

const num = (n: number, s: Span): NumberLiteral => ({ kind: 'NumberLiteral', value: n, span: s })

const isNumber = (e: Expression): e is NumberLiteral => e.kind === 'NumberLiteral'
const isVector = (e: Expression): e is VectorLiteral => e.kind === 'VectorLiteral'
const isMatrix = (e: Expression): e is MatrixLiteral => e.kind === 'MatrixLiteral'
const isPlaceholder = (e: Expression): e is Placeholder => e.kind === 'Placeholder'

export function simplify(expr: Expression): Expression {
  switch (expr.kind) {
    case 'Group':
      return simplify(expr.expr)
    case 'NumberLiteral':
    case 'Identifier':
    case 'Placeholder':
      return expr
    case 'VectorLiteral':
      return { ...expr, elements: expr.elements.map(simplify) }
    case 'MatrixLiteral':
      return { ...expr, rows: expr.rows.map((row) => row.map(simplify)) }
    case 'BinaryExpression':
      return simplifyBinary(expr)
    default:
      return expr
  }
}

function simplifyBinary(bin: BinaryExpression): Expression {
  const left = simplify(bin.left)
  const right = simplify(bin.right)

  // If placeholders are involved, keep structure
  if (isPlaceholder(left) || isPlaceholder(right)) {
    return { ...bin, left, right }
  }

  // Number ⊕ Number
  if (isNumber(left) && isNumber(right)) {
    switch (bin.op) {
      case '+': return num(left.value + right.value, spanOf(left, right))
      case '-': return num(left.value - right.value, spanOf(left, right))
      case '*': return num(left.value * right.value, spanOf(left, right))
      case '·': return num(left.value * right.value, spanOf(left, right))
    }
  }

  // Vector +/− Vector (elementwise)
  if (isVector(left) && isVector(right) && (bin.op === '+' || bin.op === '-')) {
    if (left.elements.length === right.elements.length) {
      const elems: Expression[] = []
      for (let i = 0; i < left.elements.length; i++) {
        const a = left.elements[i]
        const b = right.elements[i]
        const res = simplify({ kind: 'BinaryExpression', op: bin.op, left: a, right: b, span: spanOf(a, b) })
        elems.push(res)
      }
      return { kind: 'VectorLiteral', elements: elems, span: spanOf(left, right) }
    }
    return { ...bin, left, right } // dimension mismatch — keep as-is
  }

  // Scalar * Vector or Vector * Scalar
  if (bin.op === '*') {
    if (isNumber(left) && isVector(right)) {
      return { kind: 'VectorLiteral', elements: right.elements.map((e) => simplify(mul(left, e))), span: spanOf(left, right) }
    }
    if (isVector(left) && isNumber(right)) {
      return { kind: 'VectorLiteral', elements: left.elements.map((e) => simplify(mul(e, right))), span: spanOf(left, right) }
    }
    // Matrix * Vector (column vector)
    if (isMatrix(left) && isVector(right)) {
      const dA = dims(left)
      const n = right.elements.length
      if (dA && dA.cols === n) {
        const out = [] as Expression[]
        for (let r = 0; r < dA.rows; r++) {
          const terms: Expression[] = []
          for (let c = 0; c < dA.cols; c++) {
            terms.push(mul(left.rows[r][c], right.elements[c]))
          }
          const sum = sumExpr(terms)
          out.push(simplify(sum))
        }
        return { kind: 'VectorLiteral', elements: out, span: spanOf(left, right) }
      }
    }
    // Matrix * Matrix
    if (isMatrix(left) && isMatrix(right)) {
      const dA = dims(left)
      const dB = dims(right)
      if (dA && dB && dA.cols === dB.rows) {
        const rows: Expression[][] = []
        for (let r = 0; r < dA.rows; r++) {
          const row: Expression[] = []
          for (let c = 0; c < dB.cols; c++) {
            const terms: Expression[] = []
            for (let k = 0; k < dA.cols; k++) {
              terms.push(mul(left.rows[r][k], right.rows[k][c]))
            }
            const sum = sumExpr(terms)
            row.push(simplify(sum))
          }
          rows.push(row)
        }
        return { kind: 'MatrixLiteral', rows, span: spanOf(left, right) }
      }
    }
  }

  // Matrix and Matrix/Vector basic elementwise +/−, scalar *
  if ((isMatrix(left) || isMatrix(right)) && (bin.op === '+' || bin.op === '-' || bin.op === '*')) {
    // Scalar * Matrix or Matrix * Scalar
    if (bin.op === '*' && isNumber(left) && isMatrix(right)) {
      return scalarMat(right, left.value, spanOf(left, right))
    }
    if (bin.op === '*' && isMatrix(left) && isNumber(right)) {
      return scalarMat(left, right.value, spanOf(left, right))
    }
    // Elementwise +/− if same dims
    if ((bin.op === '+' || bin.op === '-') && isMatrix(left) && isMatrix(right)) {
      if (left.rows.length === right.rows.length && left.rows.every((r, i) => r.length === right.rows[i].length)) {
        const rows = left.rows.map((row, r) =>
          row.map((a, c) => simplify({ kind: 'BinaryExpression', op: bin.op, left: a, right: right.rows[r][c], span: spanOf(a, right.rows[r][c]) }))
        )
        return { kind: 'MatrixLiteral', rows, span: spanOf(left, right) }
      }
    }
  }

  // Vector · Vector (dot product)
  if (bin.op === '·' && isVector(left) && isVector(right)) {
    if (left.elements.length === right.elements.length) {
      const terms = left.elements.map((a, i) => mul(a, right.elements[i]))
      return simplify(sumExpr(terms))
    }
    return { ...bin, left, right }
  }

  // Vector × Vector (cross product, 3D only)
  if (bin.op === '×' && isVector(left) && isVector(right)) {
    if (left.elements.length === 3 && right.elements.length === 3) {
      const [a1, a2, a3] = left.elements
      const [b1, b2, b3] = right.elements
      const c1 = simplify(sub(mul(a2, b3), mul(a3, b2)))
      const c2 = simplify(sub(mul(a3, b1), mul(a1, b3)))
      const c3 = simplify(sub(mul(a1, b2), mul(a2, b1)))
      return { kind: 'VectorLiteral', elements: [c1, c2, c3], span: spanOf(left, right) }
    }
    return { ...bin, left, right }
  }

  // Default: reconstruct with simplified children
  return { ...bin, left, right }
}

const mul = (a: Expression, b: Expression): BinaryExpression => ({ kind: 'BinaryExpression', op: '*', left: a, right: b, span: spanOf(a, b) })

function scalarMat(m: MatrixLiteral, k: number, s: Span): MatrixLiteral {
  return {
    kind: 'MatrixLiteral',
    rows: m.rows.map((row) => row.map((e) => simplify(mul({ kind: 'NumberLiteral', value: k, span: e.span }, e)))),
    span: s,
  }
}

function dims(m: MatrixLiteral): { rows: number; cols: number } | null {
  const rows = m.rows.length
  if (rows === 0) return { rows: 0, cols: 0 }
  const cols = m.rows[0].length
  for (let r = 1; r < rows; r++) {
    if (m.rows[r].length !== cols) return null
  }
  return { rows, cols }
}

function add(a: Expression, b: Expression): BinaryExpression {
  return { kind: 'BinaryExpression', op: '+', left: a, right: b, span: spanOf(a, b) }
}

function sumExpr(terms: Expression[]): Expression {
  if (terms.length === 0) return num(0, { start: 0, end: 0 })
  return terms.slice(1).reduce<Expression>((acc, t) => add(acc, t), terms[0])
}

function sub(a: Expression, b: Expression): BinaryExpression {
  return { kind: 'BinaryExpression', op: '-', left: a, right: b, span: spanOf(a, b) }
}
