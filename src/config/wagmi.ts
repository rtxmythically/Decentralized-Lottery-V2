import { configureChains, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { w3mConnectors, w3mProvider } from '@web3modal/ethereum'

// WalletConnect Project ID (from https://cloud.walletconnect.com)
const projectId = '6d16e48457e4181b5db0e5cab8be326b'
const chains = [sepolia]

// configureChains returns a publicClient we can pass into createConfig
const { publicClient } = configureChains(chains, [w3mProvider({ projectId })])

export const config = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ chains, projectId }),
  publicClient,
})