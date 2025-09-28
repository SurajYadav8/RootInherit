"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/components/wallet-provider"
import { inheritanceABI, INHERITANCE_CONTRACT_ADDRESS } from "@/lib/abis/InheritanceContract"
import { NETWORK_CONFIG } from "@/lib/config"

interface ContractContextType {
  contract: ethers.Contract | null
  contractBalance: string
  planExists: boolean
  planDetails: {
    balance: number
    beneficiaryCount: number
    lastReset: number
    timeoutPeriod: number
    perBeneficiaryShare: number
    shareLocked: boolean
    protocolShare: number
  } | null
  beneficiaries: any[]
  isLoading: boolean
  refreshContractData: () => Promise<void>
  addBeneficiary: (address: string) => Promise<void>
  removeBeneficiary: (address: string) => Promise<void>
  createInheritancePlan: (timeoutPeriod: number) => Promise<void>
  addFunds: (amount: string) => Promise<void>
  withdrawFunds: () => Promise<void>
}

const ContractContext = createContext<ContractContextType>({
  contract: null,
  contractBalance: "0",
  planExists: false,
  planDetails: null,
  beneficiaries: [],
  isLoading: true,
  refreshContractData: async () => {},
  addBeneficiary: async () => {},
  removeBeneficiary: async () => {},
  createInheritancePlan: async () => {},
  addFunds: async () => {},
  withdrawFunds: async () => {},
})

export const useContract = () => useContext(ContractContext)

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const { address, isCorrectNetwork } = useWallet()
  
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [contractBalance, setContractBalance] = useState("0")
  const [planExists, setPlanExists] = useState(false)
  const [planDetails, setPlanDetails] = useState<any>(null)
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeContract()
  }, [address, isCorrectNetwork])

  useEffect(() => {
    if (address && isCorrectNetwork && contract) {
      refreshContractData()
    }
  }, [address, isCorrectNetwork, contract])

  const initializeContract = () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
      const contractInstance = new ethers.Contract(
        INHERITANCE_CONTRACT_ADDRESS,
        inheritanceABI,
        provider
      )
      setContract(contractInstance)
    } catch (error) {
      console.error("Failed to initialize contract:", error)
    }
  }

  const refreshContractData = async () => {
    if (!contract || !address || !isCorrectNetwork) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    try {
      // Get contract balance
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
      const balance = await provider.getBalance(INHERITANCE_CONTRACT_ADDRESS)
      setContractBalance(ethers.formatEther(balance))

      // Check if user has an inheritance plan
      const exists = await contract.ownerExists(address)
      setPlanExists(exists)

      if (exists) {
        // Get plan details
        const details = await contract.getOwnerDetails(address)
        setPlanDetails({
          balance: parseFloat(ethers.formatEther(details[0])),
          beneficiaryCount: Number(details[1]),
          lastReset: Number(details[2]),
          timeoutPeriod: Number(details[3]),
          perBeneficiaryShare: parseFloat(ethers.formatEther(details[4])),
          shareLocked: details[5],
          protocolShare: parseFloat(ethers.formatEther(details[6])),
        })

        // Get beneficiaries
        const beneficiaryAddresses = await contract.getAllBeneficiaries(address)
        setBeneficiaries(beneficiaryAddresses.map((addr: string, index: number) => ({
          id: index.toString(),
          address: addr,
          name: `Beneficiary ${index + 1}`,
          percentage: Math.floor(100 / beneficiaryAddresses.length),
          relationship: "Family",
        })))
      } else {
        setPlanDetails(null)
        setBeneficiaries([])
      }
    } catch (error) {
      console.error("Error fetching contract data:", error)
      setPlanExists(false)
      setPlanDetails(null)
      setBeneficiaries([])
    } finally {
      setIsLoading(false)
    }
  }

  const addBeneficiary = async (beneficiaryAddress: string) => {
    if (!contract || !address || !window.ethereum) {
      throw new Error("Contract or wallet not available")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contractWithSigner = new ethers.Contract(
      INHERITANCE_CONTRACT_ADDRESS,
      inheritanceABI,
      signer
    )

    const tx = await contractWithSigner.addBeneficiary(beneficiaryAddress)
    await tx.wait()
    
    await refreshContractData()
  }

  const removeBeneficiary = async (beneficiaryAddress: string) => {
    if (!contract || !address || !window.ethereum) {
      throw new Error("Contract or wallet not available")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contractWithSigner = new ethers.Contract(
      INHERITANCE_CONTRACT_ADDRESS,
      inheritanceABI,
      signer
    )

    const tx = await contractWithSigner.removeBeneficiary(beneficiaryAddress)
    await tx.wait()
    
    await refreshContractData()
  }

  const createInheritancePlan = async (timeoutPeriod: number) => {
    if (!contract || !address || !window.ethereum) {
      throw new Error("Contract or wallet not available")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contractWithSigner = new ethers.Contract(
      INHERITANCE_CONTRACT_ADDRESS,
      inheritanceABI,
      signer
    )

    const tx = await contractWithSigner.createOwner(timeoutPeriod)
    await tx.wait()
    
    await refreshContractData()
  }

  const addFunds = async (amount: string) => {
    if (!contract || !address || !window.ethereum) {
      throw new Error("Contract or wallet not available")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contractWithSigner = new ethers.Contract(
      INHERITANCE_CONTRACT_ADDRESS,
      inheritanceABI,
      signer
    )

    const tx = await contractWithSigner.addFunds({
      value: ethers.parseEther(amount)
    })
    await tx.wait()
    
    await refreshContractData()
  }

  const withdrawFunds = async () => {
    if (!contract || !address || !window.ethereum) {
      throw new Error("Contract or wallet not available")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contractWithSigner = new ethers.Contract(
      INHERITANCE_CONTRACT_ADDRESS,
      inheritanceABI,
      signer
    )

    const tx = await contractWithSigner.withdrawAll()
    await tx.wait()
    
    await refreshContractData()
  }

  const value = {
    contract,
    contractBalance,
    planExists,
    planDetails,
    beneficiaries,
    isLoading,
    refreshContractData,
    addBeneficiary,
    removeBeneficiary,
    createInheritancePlan,
    addFunds,
    withdrawFunds,
  }

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  )
}