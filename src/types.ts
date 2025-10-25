export interface Prize {
  tier: number
  amount: string
  left: number
  total: number
  prob: number
}

export interface ContractPrize {
  amount: bigint
  left: number
  total: number
  probability: number
}