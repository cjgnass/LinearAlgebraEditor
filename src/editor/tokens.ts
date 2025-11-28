export enum TokenType {
  Number = 'Number',
  Identifier = 'Identifier',
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Dot = 'Dot', // either '.' or '·'
  Cross = 'Cross', // '×'
  LAngle = 'LAngle',
  RAngle = 'RAngle',
  LBracket = 'LBracket',
  RBracket = 'RBracket',
  LParen = 'LParen',
  RParen = 'RParen',
  Comma = 'Comma',
  Semicolon = 'Semicolon',
  EOF = 'EOF',
}

export type Token = {
  type: TokenType
  value: string
  start: number
  end: number
}
