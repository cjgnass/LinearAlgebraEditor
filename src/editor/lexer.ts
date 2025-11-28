import type { Token } from './tokens'
import { TokenType } from './tokens'

const isDigit = (ch: string) => ch >= '0' && ch <= '9'
const isAlpha = (ch: string) => /[A-Za-z_]/.test(ch)
const isAlNum = (ch: string) => /[A-Za-z0-9_]/.test(ch)

export function lex(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  const push = (type: TokenType, value: string, start: number, end: number) => {
    tokens.push({ type, value, start, end })
  }

  while (i < input.length) {
    const ch = input[i]

    // Whitespace
    if (/\s/.test(ch)) { i++; continue }

    const start = i

    // Numbers: integer or decimal
    if (isDigit(ch) || (ch === '.' && isDigit(input[i+1] || ''))) {
      let j = i
      let sawDot = false
      if (input[j] === '.') { sawDot = true; j++ }
      while (isDigit(input[j] || '')) j++
      if (!sawDot && input[j] === '.') { sawDot = true; j++ }
      while (isDigit(input[j] || '')) j++
      const value = input.slice(i, j)
      push(TokenType.Number, value, start, j)
      i = j
      continue
    }

    // Identifiers
    if (isAlpha(ch)) {
      let j = i
      while (isAlNum(input[j] || '')) j++
      const value = input.slice(i, j)
      push(TokenType.Identifier, value, start, j)
      i = j
      continue
    }

    // Single-char tokens
    switch (ch) {
      case '+': push(TokenType.Plus, ch, start, start+1); i++; continue
      case '-': push(TokenType.Minus, ch, start, start+1); i++; continue
      case '*': push(TokenType.Star, ch, start, start+1); i++; continue
      case ',': push(TokenType.Comma, ch, start, start+1); i++; continue
      case ';': push(TokenType.Semicolon, ch, start, start+1); i++; continue
      case '<': push(TokenType.LAngle, ch, start, start+1); i++; continue
      case '>': push(TokenType.RAngle, ch, start, start+1); i++; continue
      case '[': push(TokenType.LBracket, ch, start, start+1); i++; continue
      case ']': push(TokenType.RBracket, ch, start, start+1); i++; continue
      case '(': push(TokenType.LParen, ch, start, start+1); i++; continue
      case ')': push(TokenType.RParen, ch, start, start+1); i++; continue
      case '·': // middle dot
      case '.': push(TokenType.Dot, ch, start, start+1); i++; continue
      case '×': push(TokenType.Cross, ch, start, start+1); i++; continue
    }

    // Unknown char – skip it for now (could record error positions later)
    i++
  }

  tokens.push({ type: TokenType.EOF, value: '', start: input.length, end: input.length })
  return tokens
}
