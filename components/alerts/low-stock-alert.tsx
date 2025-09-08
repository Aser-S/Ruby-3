"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Package } from "lucide-react"
import Link from "next/link"

interface LowStockProduct {
  id: string
  name: string
  stock_quantity: number
  low_stock_threshold: number
  sku: string | null
}

export function LowStockAlert() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLowStockProducts = async () => {
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, stock_quantity, low_stock_threshold, sku")
          .lte("stock_quantity", "low_stock_threshold")
          .gt("low_stock_threshold", 0)
          .order("stock_quantity", { ascending: true })

        if (error) throw error

        setLowStockProducts(data || [])
      } catch (error) {
        console.error("Error fetching low stock products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLowStockProducts()

    // Refresh every 5 minutes
    const interval = setInterval(fetchLowStockProducts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading || !isVisible || lowStockProducts.length === 0) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4 py-2">
        <Alert className="border-orange-200 bg-orange-50 text-orange-800">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} running low on stock:
              </span>
              <div className="flex items-center gap-1 text-sm">
                {lowStockProducts.slice(0, 3).map((product, index) => (
                  <span key={product.id}>
                    {product.name} ({product.stock_quantity} left)
                    {index < Math.min(lowStockProducts.length, 3) - 1 && ", "}
                  </span>
                ))}
                {lowStockProducts.length > 3 && <span>and {lowStockProducts.length - 3} more</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                <Link href="/dashboard/inventory">
                  <Package className="mr-1 h-3 w-3" />
                  View Inventory
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-orange-600 hover:text-orange-800"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
