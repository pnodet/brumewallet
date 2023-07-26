import { Bytes } from "@hazae41/bytes"

export interface SignatureInit {
  readonly v: number
  readonly r: Bytes<32>
  readonly s: Bytes<32>
}

export namespace Signature {

  export function from(init: SignatureInit) {
    const { v, r, s } = init

    const hv = (v - 27).toString(16).padStart(2, "0")
    const hr = Bytes.toHex(r)
    const hs = Bytes.toHex(s)

    return `0x${hr}${hs}${hv}`
  }

}