import { PairAbi } from "@/libs/abi/pair.abi"
import { PairData, pairByAddress, tokenByAddress } from "@/libs/ethereum/mods/chain"
import { Abi, Fixed, ZeroHexString } from "@hazae41/cubane"
import { Data, Fetched, FetcherMore, IDBStorage, createQuery } from "@hazae41/glacier"
import { RpcRequestPreinit } from "@hazae41/jsonrpc"
import { Option } from "@hazae41/option"
import { BgEthereumContext } from "../../../context"
import { EthereumQueryKey } from "../../wallets/data"

export namespace BgPair {

  export namespace Price {

    export type Key = EthereumQueryKey<unknown>
    export type Data = Fixed.From
    export type Fail = Error

    export const method = "eth_getPairPrice"

    export function key(pair: PairData) {
      return {
        chainId: pair.chainId,
        method: "eth_getPairPrice",
        params: [pair.address]
      }
    }

    export async function parseOrThrow(ethereum: BgEthereumContext, request: RpcRequestPreinit<unknown>, storage: IDBStorage) {
      const [address] = (request as RpcRequestPreinit<[ZeroHexString]>).params

      const pair = Option.unwrap(pairByAddress[address])

      return schema(ethereum, pair, storage)
    }

    export function schema(ethereum: BgEthereumContext, pair: PairData, storage: IDBStorage) {
      const fetcher = (key: unknown, more: FetcherMore) => Fetched.runOrDoubleWrap(async () => {
        const data = Abi.encodeOrThrow(PairAbi.getReserves.from())

        const fetched = await BgEthereumContext.fetchOrFail<ZeroHexString>(ethereum, {
          method: "eth_call",
          params: [{
            to: pair.address,
            data: data
          }, "pending"]
        }, more)

        if (fetched.isErr())
          return fetched

        const returns = Abi.createTuple(Abi.Uint112, Abi.Uint112, Abi.Uint32)
        const [a, b] = Abi.decodeOrThrow(returns, fetched.inner).intoOrThrow()

        const price = computeOrThrow(pair, [a, b])

        return new Data(price)
      })

      return createQuery<Key, Data, Fail>({
        key: key(pair),
        fetcher,
        storage
      })
    }

    export function computeOrThrow(pair: PairData, reserves: [bigint, bigint]) {
      const decimals0 = tokenByAddress[pair.token0].decimals
      const decimals1 = tokenByAddress[pair.token1].decimals

      const [reserve0, reserve1] = reserves

      const quantity0 = new Fixed(reserve0, decimals0)
      const quantity1 = new Fixed(reserve1, decimals1)

      if (pair.reversed)
        return quantity0.div(quantity1)

      return quantity1.div(quantity0)
    }

  }

}