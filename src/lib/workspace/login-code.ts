import { randomBytes } from 'node:crypto'

// Alphabet excludes ambiguous chars: 0, O, 1, I, l
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function generateSuffix(len = 4): string {
  // Rejection sampling: read bytes, discard any >= 256 - (256 % 32) to avoid
  // modulo bias against the last (256 % 32 = 0) alphabet entries. For a
  // power-of-two alphabet (32 = 2^5) the mask is sufficient.
  const mask = 31 // 0b11111 — 5 bits, picks 0..31 uniformly
  let out = ''
  while (out.length < len) {
    const bytes = randomBytes(len * 2)
    for (const b of bytes) {
      if (out.length >= len) break
      out += ALPHABET[b & mask]
    }
  }
  return out
}

// Prefix is 4 uppercase chars from the alphabet above.
// Algorithm:
//   - normalize (uppercase ASCII letters/digits/spaces only)
//   - for each word: take ALL chars if word length <= 3 (treat as acronym),
//     otherwise take only the first letter
//   - if shorter than 4, pad with remaining chars of the first word
//   - then map disallowed chars (0,O,1,I,L) -> closest allowed alternative
//   - pad with 'X' if still short; truncate to 4
//   - empty / all-special input falls back to "MOTE"
export function generatePrefix(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Fallback: "MTPS" (Mote POS) — short Mote-ish prefix that uses only
  // characters in the alphabet (excludes 0, O, 1, I)
  if (!cleaned) return 'MTPS'

  const words = cleaned.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return 'MTPS'

  let prefix = ''
  for (const word of words) {
    if (prefix.length >= 4) break
    if (word.length <= 3) {
      const take = Math.min(word.length, 4 - prefix.length)
      prefix += word.slice(0, take)
    } else {
      prefix += word[0]
    }
  }

  if (prefix.length < 4) {
    const firstWord = words[0]
    let i = prefix.length
    while (prefix.length < 4 && i < firstWord.length) {
      prefix += firstWord[i]
      i++
    }
  }

  // Map disallowed chars to closest allowed alternative so prefix stays in alphabet
  // Alphabet excludes 0, O, 1, I (L is kept; in uppercase it is unambiguous)
  const swap: Record<string, string> = { '0': '2', O: 'Q', '1': '7', I: 'J' }
  prefix = prefix
    .split('')
    .map((ch) => swap[ch] ?? ch)
    .join('')

  while (prefix.length < 4) prefix += 'X'
  return prefix.slice(0, 4)
}

export function generateLoginCode(workspaceName: string): string {
  return `${generatePrefix(workspaceName)}-${generateSuffix()}`
}

// Allowed chars: A-Z minus I, O  +  digits 2-9
const CODE_REGEX = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/
export function isValidCodeFormat(code: string): boolean {
  return CODE_REGEX.test(code)
}
