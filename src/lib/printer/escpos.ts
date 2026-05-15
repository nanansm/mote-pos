// Minimal ESC/POS command builder for thermal printer (58mm / 80mm).
// We avoid pulling a native dependency by emitting raw command bytes directly.

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

export class EscPosBuilder {
  private buf: number[] = []

  init() {
    this.buf.push(ESC, 0x40)
    return this
  }

  text(s: string) {
    for (const ch of s) this.buf.push(...this.encode(ch))
    return this
  }

  line(s = '') {
    this.text(s)
    this.buf.push(LF)
    return this
  }

  feed(n = 1) {
    this.buf.push(ESC, 0x64, n)
    return this
  }

  alignLeft() {
    this.buf.push(ESC, 0x61, 0)
    return this
  }
  alignCenter() {
    this.buf.push(ESC, 0x61, 1)
    return this
  }
  alignRight() {
    this.buf.push(ESC, 0x61, 2)
    return this
  }

  boldOn() {
    this.buf.push(ESC, 0x45, 1)
    return this
  }
  boldOff() {
    this.buf.push(ESC, 0x45, 0)
    return this
  }

  doubleHeightOn() {
    this.buf.push(GS, 0x21, 0x01)
    return this
  }
  doubleHeightOff() {
    this.buf.push(GS, 0x21, 0x00)
    return this
  }

  underlineOn() {
    this.buf.push(ESC, 0x2d, 1)
    return this
  }
  underlineOff() {
    this.buf.push(ESC, 0x2d, 0)
    return this
  }

  // Full cut
  cut() {
    this.buf.push(GS, 0x56, 0x00)
    return this
  }

  // Open cash drawer (kick-out pin 2)
  openDrawer() {
    this.buf.push(ESC, 0x70, 0x00, 0x19, 0xfa)
    return this
  }

  toBuffer() {
    return Buffer.from(this.buf)
  }

  private encode(ch: string) {
    // Latin-1 / CP437 friendly. Map common diacritics to ASCII; pass-through 0–255.
    const code = ch.charCodeAt(0)
    if (code < 0x80) return [code]
    const map: Record<string, number[]> = {
      'é': [0x82],
      'è': [0x8a],
      'ê': [0x88],
      'ë': [0x89],
      'á': [0xa0],
      'à': [0x85],
      'ä': [0x84],
      'ñ': [0xa4],
      'ó': [0xa2],
      'ú': [0xa3],
      'ü': [0x81],
      'Á': [0xb5],
      'É': [0x90],
      '°': [0xf8],
      '–': [0x2d],
      '—': [0x2d],
      '“': [0x22],
      '”': [0x22],
      '‘': [0x27],
      '’': [0x27],
      ' ': [0x20],
    }
    if (map[ch]) return map[ch]
    if (code < 0x100) return [code]
    return [0x3f] // '?'
  }
}

export function rightAlignTwoColumns(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(space) + right
}
