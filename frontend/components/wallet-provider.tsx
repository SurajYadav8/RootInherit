"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"
import { NETWORK_CONFIG } from "@/lib/config"

interface WalletContextType {
  address: string
  balance: string
  chainId: number | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchToRootstock: () => Promise<void>
  isConnecting: boolean
  isCorrectNetwork: boolean
}

const WalletContext = createContext<WalletContextType>({
  address: "",
  balance: "",
  chainId: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchToRootstock: async () => {},
  isConnecting: false,
  isCorrectNetwork: false,
})

export const useWallet = () => useContext(WalletContext)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState("")
  const [balance, setBalance] = useState("")
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const isCorrectNetwork = chainId === NETWORK_CONFIG.chainId

  useEffect(() => {
    // Check if wallet was previously connected
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await provider.listAccounts()

          if (accounts.length > 0) {
            const address = accounts[0].address
            const network = await provider.getNetwork()
            const balance = await provider.getBalance(address)

            setAddress(address)
            setChainId(Number(network.chainId))
            setBalance(ethers.formatEther(balance))
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error)
        }
      }
    }

    checkConnection()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet()
        } else if (accounts[0] !== address) {
          // User switched accounts
          connectWallet()
        }
      }

      const handleChainChanged = () => {
        // Refresh when chain changes
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [address])

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const balance = await provider.getBalance(address)

      setAddress(address)
      setChainId(Number(network.chainId))
      setBalance(ethers.formatEther(balance))

      toast({
        title: "Wallet connected",
        description: "Your wallet has been successfully connected",
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAddress("")
    setBalance("")
    setChainId(null)

    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  const switchToRootstock = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to switch networks",
        variant: "destructive",
      })
      return
    }

    try {
      // Try to switch to Rootstock Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
              chainName: NETWORK_CONFIG.name,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              nativeCurrency: NETWORK_CONFIG.nativeCurrency,
              blockExplorerUrls: [NETWORK_CONFIG.blockExplorer.url],
            }],
          })
          
          toast({
            title: "Network added",
            description: "Rootstock Testnet has been added to MetaMask",
          })
        } catch (addError) {
          console.error("Failed to add network:", addError)
          toast({
            title: "Failed to add network",
            description: "Could not add Rootstock Testnet to MetaMask",
            variant: "destructive",
          })
        }
      } else {
        console.error("Failed to switch network:", switchError)
        toast({
          title: "Failed to switch network",
          description: "Could not switch to Rootstock Testnet",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        chainId,
        connectWallet,
        disconnectWallet,
        switchToRootstock,
        isConnecting,
        isCorrectNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
