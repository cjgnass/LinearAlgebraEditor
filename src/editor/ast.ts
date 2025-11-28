export type Span = {
  start: number
  end: number
}

export type NumberLiteral = {
  kind: 'NumberLiteral'
  value: number
  span: Span
}

export type Identifier = {
  kind: 'Identifier'
  name: string
  span: Span
}

export type Placeholder = {
  kind: 'Placeholder'
  expected: 'expression' | 'vector' | 'matrix' | 'row' | 'element'
  span: Span
}

export type VectorLiteral = {
  kind: 'VectorLiteral'
  elements: Expression[]
  span: Span
}

export type MatrixLiteral = {
  kind: 'MatrixLiteral'
  rows: Expression[][]
  span: Span
}

export type BinaryExpression = {
  kind: 'BinaryExpression'
  op: '+' | '-' | '*' | '·' | '×'
  left: Expression
  right: Expression
  span: Span
}

export type Group = {
  kind: 'Group'
  expr: Expression
  span: Span
}

export type Expression =
  | NumberLiteral
  | Identifier
  | VectorLiteral
  | MatrixLiteral
  | BinaryExpression
  | Group
  | Placeholder

export type ParseResult = {
  expr: Expression
  errors: string[]
}
