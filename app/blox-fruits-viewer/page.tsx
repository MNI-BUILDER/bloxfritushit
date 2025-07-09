"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Zap, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StockData {
  id: string
  name: string
  price: number
  quantity: number
  lastUpdated: number
  createdAt: number
}

export default function BloxFruitsViewer() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const { toast } = useToast()

  const fetchStocks = async () => {
    setLoading(true)
    try {
      // Use public access
      const response = await fetch("/api/stocks/bloxfruits?key=status")
      const data = await response.json()

      if (data.success) {
        setStocks(data.data || [])
        setLastUpdate(new Date().toLocaleTimeString())
        toast({
          title: "Success",
          description: `Loaded ${data.count || 0} fruits`,
        })
      } else {
        throw new Error(data.message || "Failed to fetch")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch stocks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`
    return price.toString()
  }

  const normalFruits = stocks.filter((stock) => stock.name.includes("(Normal)"))
  const mirageFruits = stocks.filter((stock) => stock.name.includes("(Mirage)"))

  useEffect(() => {
    fetchStocks()
    const interval = setInterval(fetchStocks, 15000) // Auto-refresh every 15 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Blox Fruits Stock Monitor
        </h1>
        <p className="text-muted-foreground">
          Real-time fruit stock from Roblox Blox Fruits • Last updated: {lastUpdate}
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            Normal: {normalFruits.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Eye className="w-4 h-4 mr-2" />
            Mirage: {mirageFruits.length}
          </Badge>
        </div>
        <Button onClick={fetchStocks} disabled={loading} size="lg">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Normal Fruits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Normal Fruits ({normalFruits.length})
            </CardTitle>
            <CardDescription>Regular fruit stock available in the game</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {normalFruits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No normal fruits in stock</p>
              ) : (
                normalFruits.map((fruit) => (
                  <div
                    key={fruit.id}
                    className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{fruit.name.replace(" (Normal)", "")}</h3>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(fruit.lastUpdated)}</p>
                    </div>
                    <Badge variant="secondary" className="text-lg font-bold">
                      ${formatPrice(fruit.price)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mirage Fruits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              Mirage Fruits ({mirageFruits.length})
            </CardTitle>
            <CardDescription>Special mirage island fruit stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mirageFruits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No mirage fruits in stock</p>
              ) : (
                mirageFruits.map((fruit) => (
                  <div
                    key={fruit.id}
                    className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{fruit.name.replace(" (Mirage)", "")}</h3>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(fruit.lastUpdated)}</p>
                    </div>
                    <Badge variant="secondary" className="text-lg font-bold">
                      ${formatPrice(fruit.price)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>How your Roblox script connects to this API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">✅ Working</h4>
              <p>Your Roblox script sends data to:</p>
              <code className="text-xs bg-white dark:bg-gray-800 p-1 rounded mt-1 block">
                POST /api/stocks/bloxfruits
              </code>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🔑 Auth Key</h4>
              <p>Authorization header:</p>
              <code className="text-xs bg-white dark:bg-gray-800 p-1 rounded mt-1 block">GAMERSBERG</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
