"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useWallet } from "@/components/wallet-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Bell, Moon, Shield, Sun, Network, AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ethers } from "ethers"
import { inheritanceABI, INHERITANCE_CONTRACT_ADDRESS } from "@/lib/abis/InheritanceContract"
import { NETWORK_CONFIG } from "@/lib/config"

export default function SettingsPage() {
  const { address, connectWallet, disconnectWallet, switchToRootstock, isCorrectNetwork, chainId } = useWallet()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("account")
  const [theme, setTheme] = useState("dark")
  const [language, setLanguage] = useState("en")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  
  // Contract-related state
  const [contractBalance, setContractBalance] = useState("0")
  const [contractStats, setContractStats] = useState({
    totalOwners: 0,
    totalBeneficiaries: 0,
    totalValue: "0"
  })

  // Fetch contract statistics
  useEffect(() => {
    fetchContractStats()
  }, [address])

  const fetchContractStats = async () => {
    if (!address) return

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
      const contract = new ethers.Contract(INHERITANCE_CONTRACT_ADDRESS, inheritanceABI, provider)
      
      // Get contract balance
      const balance = await provider.getBalance(INHERITANCE_CONTRACT_ADDRESS)
      setContractBalance(ethers.formatEther(balance))

      // Get user-specific stats if possible
      try {
        const ownerExists = await contract.ownerExists(address)
        if (ownerExists) {
          const beneficiaries = await contract.getAllBeneficiaries(address)
          setContractStats(prev => ({
            ...prev,
            totalBeneficiaries: beneficiaries.length
          }))
        }
      } catch (error) {
        console.log("Could not fetch user-specific stats:", error)
      }
    } catch (error) {
      console.error("Error fetching contract stats:", error)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  const saveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    })
  }

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-6">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">Please connect your wallet to access settings</p>
          <Button onClick={connectWallet} className="bg-gradient-to-r from-purple-600 to-blue-600">
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400 mb-6">Customize your experience and manage your account</p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-black/40 border border-white/10">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="contract">Contract</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-4 space-y-6">
              <Card className="bg-black/40 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Manage your account details and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="wallet-address">Wallet Address</Label>
                    <div className="flex">
                      <Input id="wallet-address" value={address} readOnly className="bg-black/30 border-white/10" />
                      <Button variant="outline" className="ml-2 border-white/10">
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name (Optional)</Label>
                    <Input
                      id="display-name"
                      placeholder="Enter a display name"
                      className="bg-black/30 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="bg-black/30 border-white/10"
                    />
                    <p className="text-xs text-gray-400">Used for notifications and recovery</p>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Preferences</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="email-notifications" className="flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <span>Email Notifications</span>
                      </Label>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="push-notifications" className="flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <span>Push Notifications</span>
                      </Label>
                      <Switch
                        id="push-notifications"
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="border-white/10" onClick={disconnectWallet}>
                    Disconnect Wallet
                  </Button>
                  <Button
                    onClick={saveSettings}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-4 space-y-6">
              <Card className="bg-black/40 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>Customize how the application looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Theme</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-lg border cursor-pointer flex items-center justify-center flex-col gap-2 ${theme === "dark"
                          ? "bg-gray-900 border-purple-500"
                          : "bg-gray-900/50 border-white/10 hover:border-white/30"
                          }`}
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="h-6 w-6 text-purple-400" />
                        <span>Dark</span>
                      </div>

                      <div
                        className={`p-4 rounded-lg border cursor-pointer flex items-center justify-center flex-col gap-2 ${theme === "light"
                          ? "bg-gray-900 border-purple-500"
                          : "bg-gray-900/50 border-white/10 hover:border-white/30"
                          }`}
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="h-6 w-6 text-amber-400" />
                        <span>Light</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language" className="bg-black/30 border-white/10">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={saveSettings}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="mt-4 space-y-6">
              <Card className="bg-black/40 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network Settings
                  </CardTitle>
                  <CardDescription>Manage your blockchain network configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-white/5">
                      <div>
                        <h3 className="font-medium">Current Network</h3>
                        <p className="text-sm text-gray-400">
                          {chainId === NETWORK_CONFIG.chainId ? NETWORK_CONFIG.name : `Chain ID: ${chainId || 'Not connected'}`}
                        </p>
                      </div>
                      <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
                        {isCorrectNetwork ? "Connected" : "Wrong Network"}
                      </Badge>
                    </div>

                    {!isCorrectNetwork && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Network Mismatch</span>
                        </div>
                        <p className="text-sm text-amber-300/80 mb-3">
                          You need to switch to Rootstock Testnet to use this application.
                        </p>
                        <Button onClick={switchToRootstock} variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/10">
                          Switch to Rootstock Testnet
                        </Button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="font-medium">Network Details</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Network Name:</span>
                          <span>{NETWORK_CONFIG.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Chain ID:</span>
                          <span>{NETWORK_CONFIG.chainId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Currency:</span>
                          <span>{NETWORK_CONFIG.nativeCurrency.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">RPC URL:</span>
                          <span className="text-xs">{NETWORK_CONFIG.rpcUrl}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contract" className="mt-4 space-y-6">
              <Card className="bg-black/40 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Contract Information
                  </CardTitle>
                  <CardDescription>Information about your inheritance smart contract</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                        <div className="text-2xl font-bold text-purple-400">{contractStats.totalBeneficiaries}</div>
                        <div className="text-sm text-gray-400">Your Beneficiaries</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                        <div className="text-2xl font-bold text-green-400">{parseFloat(contractBalance).toFixed(4)}</div>
                        <div className="text-sm text-gray-400">Contract Balance (tRBTC)</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                        <div className="text-2xl font-bold text-amber-400">{chainId === NETWORK_CONFIG.chainId ? "✓" : "✗"}</div>
                        <div className="text-sm text-gray-400">Network Status</div>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="space-y-3">
                      <h3 className="font-medium">Contract Details</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Contract Address:</span>
                          <span className="text-xs font-mono">{INHERITANCE_CONTRACT_ADDRESS}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Network:</span>
                          <span>{NETWORK_CONFIG.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your Account:</span>
                          <span className="text-xs font-mono">{address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={fetchContractStats}
                        variant="outline"
                        className="border-white/10 hover:border-white/30"
                      >
                        Refresh Stats
                      </Button>
                      <Button
                        onClick={() => window.open(`${NETWORK_CONFIG.blockExplorer.url}/address/${INHERITANCE_CONTRACT_ADDRESS}`, '_blank')}
                        variant="outline"
                        className="border-white/10 hover:border-white/30"
                      >
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-4 space-y-6">
              <Card className="bg-black/40 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-medium">Two-Factor Authentication #TODO</h3>
                        <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                      </div>
                      <Switch id="two-factor" checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                    </div>

                    {twoFactorEnabled && (
                      <div className="p-4 rounded-lg bg-gray-900/50 border border-white/5 space-y-4">
                        <p className="text-sm">
                          Scan the QR code with an authenticator app like Google Authenticator or Authy.
                        </p>
                        <div className="flex justify-center">
                          <div className="w-40 h-40 bg-white p-2 rounded-lg">
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-black">QR Code</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="verification-code">Verification Code</Label>
                          <Input
                            id="verification-code"
                            placeholder="Enter 6-digit code"
                            className="bg-black/30 border-white/10"
                          />
                        </div>
                        <Button className="w-full bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600">
                          Verify and Enable
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Connected Devices</h3>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-green-400 mr-2" />
                          <div>
                            <div className="font-medium">Current Device</div>
                            <div className="text-xs text-gray-400">Last active: Just now</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Recovery Email</h3>
                    <p className="text-sm text-gray-400">
                      This email will be used for account recovery and security alerts
                    </p>
                    <Input placeholder="recovery@email.com" className="bg-black/30 border-white/10" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={saveSettings}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Save Security Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  )
}
