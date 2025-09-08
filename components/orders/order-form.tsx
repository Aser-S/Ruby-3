"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, UserPlus, Package, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Customer {
  id: string
  name: string
  email: string | null
  balance?: number
}

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  sku: string | null
}

interface OrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

interface OrderFormProps {
  customers: Customer[]
  products: Product[]
}

export function OrderForm({ customers, products }: OrderFormProps) {
  const [customerId, setCustomerId] = useState<string>("walk-in")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [notes, setNotes] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    balance: "0",
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [customersList, setCustomersList] = useState<Customer[]>(customers)

  const [showNewProductDialog, setShowNewProductDialog] = useState(false)
  const [newProductData, setNewProductData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "0",
    low_stock_threshold: "10",
    category: "",
    sku: "",
  })
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [productsList, setProductsList] = useState<Product[]>(products)
  const [activeOrderItemIndex, setActiveOrderItemIndex] = useState<number | null>(null)

  const router = useRouter()

  const handleCreateProduct = async () => {
    if (!newProductData.name.trim()) {
      setError("Product name is required")
      return
    }

    if (!newProductData.price || Number.parseFloat(newProductData.price) <= 0) {
      setError("Valid product price is required")
      return
    }

    setIsCreatingProduct(true)
    setError(null)

    const supabase = createClient()

    try {
      const productData = {
        name: newProductData.name.trim(),
        description: newProductData.description.trim() || null,
        price: Number.parseFloat(newProductData.price),
        stock_quantity: Number.parseInt(newProductData.stock_quantity) || 0,
        low_stock_threshold: Number.parseInt(newProductData.low_stock_threshold) || 10,
        category: newProductData.category.trim() || null,
        sku: newProductData.sku.trim() || null,
      }

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single()

      if (productError) throw productError

      // Add to local products list
      const newProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        stock_quantity: product.stock_quantity,
        sku: product.sku,
      }
      setProductsList([...productsList, newProduct])

      // If this was triggered from an order item, select the new product
      if (activeOrderItemIndex !== null) {
        updateOrderItem(activeOrderItemIndex, "productId", product.id)
      }

      // Reset form and close dialog
      setNewProductData({
        name: "",
        description: "",
        price: "",
        stock_quantity: "0",
        low_stock_threshold: "10",
        category: "",
        sku: "",
      })
      setShowNewProductDialog(false)
      setActiveOrderItemIndex(null)
    } catch (error: any) {
      setError(error.message || "Failed to create product")
    } finally {
      setIsCreatingProduct(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      setError("Customer name is required")
      return
    }

    setIsCreatingCustomer(true)
    setError(null)

    const supabase = createClient()

    try {
      const customerData = {
        name: newCustomerData.name.trim(),
        email: newCustomerData.email.trim() || null,
        phone: newCustomerData.phone.trim() || null,
        address: newCustomerData.address.trim() || null,
        balance: Number.parseFloat(newCustomerData.balance) || 0,
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert([customerData])
        .select()
        .single()

      if (customerError) throw customerError

      // Add to local customers list and select the new customer
      const newCustomer = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        balance: customer.balance,
      }
      setCustomersList([...customersList, newCustomer])
      setCustomerId(customer.id)

      // Reset form and close dialog
      setNewCustomerData({ name: "", email: "", phone: "", address: "", balance: "0" })
      setShowNewCustomerDialog(false)
    } catch (error: any) {
      setError(error.message || "Failed to create customer")
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: "", quantity: 1, unitPrice: 0 }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updatedItems = [...orderItems]
    if (field === "productId" && typeof value === "string") {
      const product = productsList.find((p) => p.id === value)
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          unitPrice: product.price,
        }
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value }
    }
    setOrderItems(updatedItems)
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const selectedCustomer = customersList.find((c) => c.id === customerId)
  const orderTotal = calculateTotal()
  const hasInsufficientBalance =
    paymentMethod === "customer_balance" &&
    selectedCustomer &&
    selectedCustomer.balance !== undefined &&
    selectedCustomer.balance < orderTotal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (orderItems.length === 0) {
      setError("Please add at least one item to the order")
      setIsSubmitting(false)
      return
    }

    if (paymentMethod === "customer_balance") {
      if (customerId === "walk-in") {
        setError("Customer balance payment requires selecting a customer")
        setIsSubmitting(false)
        return
      }

      if (hasInsufficientBalance) {
        setError(
          `Insufficient customer balance. Available: ${formatCurrency(selectedCustomer?.balance || 0)}, Required: ${formatCurrency(orderTotal)}`,
        )
        setIsSubmitting(false)
        return
      }
    }

    const supabase = createClient()

    try {
      if (paymentMethod === "customer_balance" && customerId !== "walk-in") {
        const { error: balanceError } = await supabase
          .from("customers")
          .update({
            balance: (selectedCustomer?.balance || 0) - orderTotal,
          })
          .eq("id", customerId)

        if (balanceError) throw balanceError
      }

      const orderData = {
        customer_id: customerId === "walk-in" ? null : customerId,
        order_number: "", // Will be auto-generated by trigger
        total_amount: calculateTotal(),
        status: "pending" as const,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
      }

      const { data: order, error: orderError } = await supabase.from("orders").insert([orderData]).select().single()

      if (orderError) throw orderError

      const orderItemsData = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData)

      if (itemsError) throw itemsError

      router.push(`/dashboard/orders/${order.id}`)
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Select a customer or add a new walk-in customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <div className="flex gap-2">
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                        {customersList.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} {customer.email && `(${customer.email})`}
                            {customer.balance !== undefined && ` - Balance: ${formatCurrency(customer.balance)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add New Customer</DialogTitle>
                          <DialogDescription>
                            Quickly add a new walk-in customer to save their information for future orders.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-customer-name">Name *</Label>
                            <Input
                              id="new-customer-name"
                              value={newCustomerData.name}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Customer name"
                              required
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-customer-email">Email</Label>
                              <Input
                                id="new-customer-email"
                                type="email"
                                value={newCustomerData.email}
                                onChange={(e) => setNewCustomerData((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="customer@email.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-customer-phone">Phone</Label>
                              <Input
                                id="new-customer-phone"
                                value={newCustomerData.phone}
                                onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1 (555) 123-4567"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-customer-address">Address</Label>
                            <Textarea
                              id="new-customer-address"
                              value={newCustomerData.address}
                              onChange={(e) => setNewCustomerData((prev) => ({ ...prev, address: e.target.value }))}
                              placeholder="Customer address"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreateCustomer}
                              disabled={isCreatingCustomer || !newCustomerData.name.trim()}
                            >
                              {isCreatingCustomer ? "Adding..." : "Add Customer"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                {paymentMethod === "customer_balance" && selectedCustomer && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Customer Balance:</span>
                      <span
                        className={
                          selectedCustomer.balance && selectedCustomer.balance >= orderTotal
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatCurrency(selectedCustomer.balance || 0)}
                      </span>
                    </div>
                    {hasInsufficientBalance && (
                      <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>Insufficient balance for this order</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>Add products to this order</CardDescription>
                </div>
                <Button type="button" onClick={addOrderItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item, index) => {
                  const product = productsList.find((p) => p.id === item.productId)
                  return (
                    <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Product</Label>
                        <div className="flex gap-2">
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateOrderItem(index, "productId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsList.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {formatCurrency(product.price)}
                                  {product.sku && ` (${product.sku})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setActiveOrderItemIndex(index)}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                                <DialogDescription>
                                  Quickly add a new product to your inventory and use it in this order.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-name">Product Name *</Label>
                                    <Input
                                      id="new-product-name"
                                      value={newProductData.name}
                                      onChange={(e) => setNewProductData((prev) => ({ ...prev, name: e.target.value }))}
                                      placeholder="Product name"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-sku">SKU</Label>
                                    <Input
                                      id="new-product-sku"
                                      value={newProductData.sku}
                                      onChange={(e) => setNewProductData((prev) => ({ ...prev, sku: e.target.value }))}
                                      placeholder="Product SKU"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-product-description">Description</Label>
                                  <Textarea
                                    id="new-product-description"
                                    value={newProductData.description}
                                    onChange={(e) =>
                                      setNewProductData((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    placeholder="Product description"
                                    rows={2}
                                  />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-category">Category</Label>
                                    <Input
                                      id="new-product-category"
                                      value={newProductData.category}
                                      onChange={(e) =>
                                        setNewProductData((prev) => ({ ...prev, category: e.target.value }))
                                      }
                                      placeholder="Product category"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-price">Price *</Label>
                                    <Input
                                      id="new-product-price"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newProductData.price}
                                      onChange={(e) =>
                                        setNewProductData((prev) => ({ ...prev, price: e.target.value }))
                                      }
                                      placeholder="0.00"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-stock">Stock Quantity</Label>
                                    <Input
                                      id="new-product-stock"
                                      type="number"
                                      min="0"
                                      value={newProductData.stock_quantity}
                                      onChange={(e) =>
                                        setNewProductData((prev) => ({ ...prev, stock_quantity: e.target.value }))
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="new-product-threshold">Low Stock Alert</Label>
                                    <Input
                                      id="new-product-threshold"
                                      type="number"
                                      min="0"
                                      value={newProductData.low_stock_threshold}
                                      onChange={(e) =>
                                        setNewProductData((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                                      }
                                      placeholder="10"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setShowNewProductDialog(false)
                                      setActiveOrderItemIndex(null)
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleCreateProduct}
                                    disabled={isCreatingProduct || !newProductData.name.trim() || !newProductData.price}
                                  >
                                    {isCreatingProduct ? "Adding..." : "Add Product"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {product && product.stock_quantity < item.quantity && (
                          <p className="text-sm text-destructive mt-1">Only {product.stock_quantity} in stock</p>
                        )}
                      </div>
                      <div className="w-24">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || Number.parseFloat(value) >= 0) {
                              updateOrderItem(index, "quantity", Number.parseFloat(value) || 0)
                            }
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="w-32">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-32">
                        <Label>Total</Label>
                        <div className="h-10 flex items-center font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
                {orderItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items ({orderItems.length})</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="customer_balance" disabled={customerId === "walk-in"}>
                      Customer Balance {customerId === "walk-in" && "(Select customer first)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {paymentMethod === "customer_balance" && customerId !== "walk-in" && selectedCustomer && (
                  <div className="text-sm text-muted-foreground">
                    Available balance: {formatCurrency(selectedCustomer.balance || 0)}
                    {hasInsufficientBalance && <span className="text-red-600 block">⚠ Insufficient funds</span>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes (optional)"
                  rows={3}
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || orderItems.length === 0 || hasInsufficientBalance}>
                  {isSubmitting ? "Creating..." : "Create Order"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/orders">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
