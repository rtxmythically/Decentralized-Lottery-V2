import { configureChains, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'

const projectId = '6d16e48457e4181b5db0e5cab8be326b'

const { chains, publicClient } = configureChains(
  [sepolia],
  [publicProvider()]
)

const connectors = [
  new InjectedConnector({
    chains,
    options: {
      name: 'Injected',
      shimDisconnect: true,
    },
  }),
  new WalletConnectConnector({
    chains,
    options: {
      projectId,
      metadata: {
        name: 'Decentralized Lottery V2',
        description: 'Blockchain-based lottery game',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    }
  })
]

export const config = createConfig({
  autoConnect: true,
  publicClient,
  connectors
})