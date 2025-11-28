import type { Expression, Placeholder, VectorLiteral, MatrixLiteral, BinaryExpression, Group } from './ast'
import type { Token } from './tokens'
import { TokenType } from './tokens'

type State = {
  tokens: Token[]
  i: number
  errors: string[]
}

const at = (st: State) => st.tokens[st.i]
const next = (st: State) => st.tokens[st.i + 1]
const eat = (st: State, type?: TokenType): Token | null => {
  const t = at(st)
  if (!type || t.type === type) { st.i++; return t }
  return null
}
const expect = (st: State, type: TokenType, msg: string) => {
  const t = at(st)
  if (t.type === type) return eat(st)
  st.errors.push(`${msg} at ${t.start}`)
  return null
}

export function parse(tokens: Token[]): { expr: Expression; errors: string[] } {
  const st: State = { tokens, i: 0, errors: [] }
  const expr = parseExpression(st)
  return { expr, errors: st.errors }
}

function placeholder(expected: Placeholder['expected'], start: number, end: number): Placeholder {
  return { kind: 'Placeholder', expected, span: { start, end } }
}

function parseExpression(st: State): Expression {
  return parseAddSub(st)
}

function parseAddSub(st: State): Expression {
  let left = parseMul(st)
  while (at(st).type === TokenType.Plus || at(st).type === TokenType.Minus) {
    const opTok = eat(st)!
    let right: Expression
    const nextTok = at(st)
    if (
      nextTok.type === TokenType.EOF ||
      nextTok.type === TokenType.RAngle ||
      nextTok.type === TokenType.RBracket ||
      nextTok.type === TokenType.RParen
    ) {
      right = placeholder('expression', nextTok.start, nextTok.end)
    } else {
      right = parseMul(st)
    }
    const span = { start: (left as any).span.start, end: (right as any).span.end }
    left = { kind: 'BinaryExpression', op: opTok.value as BinaryExpression['op'], left, right, span }
  }
  return left
}

function parseMul(st: State): Expression {
  let left = parsePrimary(st)
  while (at(st).type === TokenType.Star || at(st).type === TokenType.Dot || at(st).type === TokenType.Cross) {
    const opTok = eat(st)!
    let right: Expression
    const nextTok = at(st)
    if (
      nextTok.type === TokenType.EOF ||
      nextTok.type === TokenType.RAngle ||
      nextTok.type === TokenType.RBracket ||
      nextTok.type === TokenType.RParen
    ) {
      right = placeholder('expression', nextTok.start, nextTok.end)
    } else {
      right = parsePrimary(st)
    }
    const span = { start: (left as any).span.start, end: (right as any).span.end }
    const op = opTok.type === TokenType.Star ? '*' : (opTok.type === TokenType.Dot ? '·' : '×')
    left = { kind: 'BinaryExpression', op, left, right, span }
  }
  return left
}

function parsePrimary(st: State): Expression {
  const t = at(st)
  switch (t.type) {
    case TokenType.Number: {
      eat(st)
      return { kind: 'NumberLiteral', value: Number(t.value), span: { start: t.start, end: t.end } }
    }
    case TokenType.Identifier: {
      eat(st)
      return { kind: 'Identifier', name: t.value, span: { start: t.start, end: t.end } }
    }
    case TokenType.LParen: {
      const l = eat(st)!
      const expr = parseExpression(st)
      const r = eat(st, TokenType.RParen)
      const end = r ? r.end : at(st).start
      return { kind: 'Group', expr, span: { start: l.start, end } }
    }
    case TokenType.LAngle:
      return parseVector(st)
    case TokenType.LBracket:
      return parseMatrix(st)
    default: {
      // Unexpected; produce placeholder at this point and advance if not EOF
      const start = t.start
      if (t.type !== TokenType.EOF) eat(st)
      return placeholder('expression', start, t.end)
    }
  }
}

function parseVector(st: State): VectorLiteral | Placeholder {
  const l = expect(st, TokenType.LAngle, 'Expected "<" to start a vector')
  const elements: Expression[] = []
  let pendingIndex: number | null = null
  while (at(st).type !== TokenType.EOF) {
    if (at(st).type === TokenType.RAngle) { break }
    if (at(st).type === TokenType.Semicolon || at(st).type === TokenType.RBracket) break
    if (at(st).type === TokenType.Comma) {
      const comma = eat(st)!
      if (pendingIndex !== null) {
        pendingIndex = null
      }
      const slot = placeholder('element', comma.start, comma.end)
      elements.push(slot)
      pendingIndex = elements.length - 1
      continue
    }
    const el = parseExpression(st)
    if (pendingIndex !== null) {
      elements[pendingIndex] = el
      pendingIndex = null
    } else {
      elements.push(el)
    }
  }
  const r = at(st).type === TokenType.RAngle ? eat(st)! : null
  const start = l ? l.start : (elements[0]?.span.start ?? at(st).start)
  const end = r ? r.end : at(st).start
  if (!r) st.errors.push('Unclosed vector; missing ">"')
  return { kind: 'VectorLiteral', elements, span: { start, end } }
}

function parseMatrix(st: State): MatrixLiteral | Placeholder {
  const l = expect(st, TokenType.LBracket, 'Expected "[" to start a matrix')
  const rows: Expression[][] = []
  let currentRow: Expression[] = []
  let pendingIndex: number | null = null
  while (at(st).type !== TokenType.EOF) {
    const tok = at(st)
    if (tok.type === TokenType.RBracket) { break }
    if (tok.type === TokenType.Semicolon) {
      const semi = eat(st)!
      if (currentRow.length === 0) {
        currentRow.push(placeholder('element', semi.start, semi.end))
      }
      rows.push(currentRow)
      currentRow = [placeholder('element', semi.start, semi.end)]
      pendingIndex = 0
      continue
    }
    if (tok.type === TokenType.Comma) {
      const comma = eat(st)!
      if (pendingIndex !== null) {
        pendingIndex = null
      }
      const slot = placeholder('element', comma.start, comma.end)
      currentRow.push(slot)
      pendingIndex = currentRow.length - 1
      continue
    }
    if (tok.type === TokenType.RAngle || tok.type === TokenType.RParen) break
    const cell = parseExpression(st)
    if (pendingIndex !== null) {
      currentRow[pendingIndex] = cell
      pendingIndex = null
    } else {
      currentRow.push(cell)
    }
  }
  if (currentRow.length === 0) {
    const t = at(st)
    currentRow.push(placeholder('element', t.start, t.end))
  }
  rows.push(currentRow)

  const r = at(st).type === TokenType.RBracket ? eat(st)! : null
  const start = l ? l.start : (rows[0]?.[0]?.span.start ?? at(st).start)
  const end = r ? r.end : at(st).start
  if (!r) st.errors.push('Unclosed matrix; missing "]"')
  return { kind: 'MatrixLiteral', rows, span: { start, end } }
}
