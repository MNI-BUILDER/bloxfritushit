import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for fast access (use Redis/Database in production)
interface StockData {
  id: string
  name: string
  price: number
  quantity: number
  lastUpdated: number
  createdAt: number
}

// Global storage with TTL cleanup
const stocksData = new Map<string, StockData>()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
const DATA_EXPIRY = 10 * 60 * 1000 // 10 minutes

// Authorization middleware
function authorize(request: NextRequest, method = "GET") {
  const { searchParams } = new URL(request.url)
  const keyParam = searchParams.get("key")

  // Allow public access for GET requests with ?key=status
  if (method === "GET" && keyParam === "status") {
    return null // No authorization required
  }

  const authHeader = request.headers.get("Authorization")
  const validKey = "GAMERSBERG"

  if (!authHeader || authHeader !== validKey) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or missing Authorization header",
        hint: "For public access, use ?key=status (GET requests only)",
      },
      { status: 401 },
    )
  }
  return null
}

// Automatic cleanup function
function cleanupExpiredData() {
  const now = Date.now()
  for (const [key, data] of stocksData.entries()) {
    if (now - data.lastUpdated > DATA_EXPIRY) {
      stocksData.delete(key)
      console.log(`Cleaned up expired data for: ${key}`)
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredData, CLEANUP_INTERVAL)

// GET - Retrieve stock data
export async function GET(request: NextRequest) {
  const authError = authorize(request, "GET")
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const keyParam = searchParams.get("key")
    const isPublicAccess = keyParam === "status"

    // Clean up expired data before responding
    cleanupExpiredData()

    if (id) {
      const stock = stocksData.get(id)
      if (!stock) {
        return NextResponse.json({ error: "Not found", message: `Stock with id ${id} not found` }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: stock,
        ...(isPublicAccess && { access: "public" }),
      })
    }

    // Return all stocks
    const allStocks = Array.from(stocksData.values())
    return NextResponse.json({
      success: true,
      data: allStocks,
      count: allStocks.length,
      lastCleanup: new Date().toISOString(),
      ...(isPublicAccess && {
        access: "public",
        note: "Public access via ?key=status parameter",
      }),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", message: "Failed to retrieve data" }, { status: 500 })
  }
}

// POST - Create new stock entry (Updated for Roblox data)
export async function POST(request: NextRequest) {
  const authError = authorize(request, "POST")
  if (authError) return authError

  try {
    const body = await request.json()

    // Handle Roblox script data structure
    if (body.sessionId && (body.normalStock || body.mirageStock)) {
      const now = Date.now()
      const sessionId = body.sessionId

      // Process normal stock
      if (body.normalStock && Array.isArray(body.normalStock)) {
        for (const fruit of body.normalStock) {
          if (fruit.name && typeof fruit.price === "number") {
            const id = `normal-${fruit.name.toLowerCase().replace(/\s+/g, "-")}-${sessionId.slice(-8)}`
            const stockData: StockData = {
              id,
              name: `${fruit.name} (Normal)`,
              price: fruit.price,
              quantity: 1,
              lastUpdated: now,
              createdAt: now,
            }
            stocksData.set(id, stockData)
          }
        }
      }

      // Process mirage stock
      if (body.mirageStock && Array.isArray(body.mirageStock)) {
        for (const fruit of body.mirageStock) {
          if (fruit.name && typeof fruit.price === "number") {
            const id = `mirage-${fruit.name.toLowerCase().replace(/\s+/g, "-")}-${sessionId.slice(-8)}`
            const stockData: StockData = {
              id,
              name: `${fruit.name} (Mirage)`,
              price: fruit.price,
              quantity: 1,
              lastUpdated: now,
              createdAt: now,
            }
            stocksData.set(id, stockData)
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: "Blox Fruits stock updated successfully",
          data: {
            sessionId: body.sessionId,
            playerName: body.playerName,
            serverId: body.serverId,
            normalCount: body.normalStock?.length || 0,
            mirageCount: body.mirageStock?.length || 0,
            totalFruits: body.totalFruits || 0,
            timestamp: new Date(now).toISOString(),
          },
        },
        { status: 201 },
      )
    }

    // Handle simple stock data (original format)
    const { name, price, quantity } = body
    if (!name || typeof price !== "number" || typeof quantity !== "number") {
      return NextResponse.json(
        {
          error: "Bad request",
          message:
            "Missing or invalid fields: name, price, quantity required OR use Roblox format with sessionId, normalStock, mirageStock",
        },
        { status: 400 },
      )
    }

    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`
    const now = Date.now()

    const newStock: StockData = {
      id,
      name,
      price,
      quantity,
      lastUpdated: now,
      createdAt: now,
    }

    stocksData.set(id, newStock)

    return NextResponse.json(
      {
        success: true,
        message: "Stock created successfully",
        data: newStock,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST Error:", error)
    return NextResponse.json({ error: "Internal server error", message: "Failed to create stock" }, { status: 500 })
  }
}

// PUT - Update existing stock or create if not exists
export async function PUT(request: NextRequest) {
  const authError = authorize(request, "PUT")
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, name, price, quantity } = body

    if (!id) {
      return NextResponse.json({ error: "Bad request", message: "Stock ID is required" }, { status: 400 })
    }

    const existingStock = stocksData.get(id)
    if (!existingStock) {
      return NextResponse.json({ error: "Not found", message: `Stock with id ${id} not found` }, { status: 404 })
    }

    // Update fields if provided
    const updatedStock: StockData = {
      ...existingStock,
      name: name ?? existingStock.name,
      price: price ?? existingStock.price,
      quantity: quantity ?? existingStock.quantity,
      lastUpdated: Date.now(),
    }

    stocksData.set(id, updatedStock)

    return NextResponse.json({
      success: true,
      message: "Stock updated successfully",
      data: updatedStock,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", message: "Failed to update stock" }, { status: 500 })
  }
}

// DELETE - Remove stock entry or cleanup session
export async function DELETE(request: NextRequest) {
  const authError = authorize(request, "DELETE")
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    // Handle session cleanup from Roblox
    if (!id) {
      try {
        const body = await request.json()
        if (body.sessionId) {
          // Clean up all stocks for this session
          let deletedCount = 0
          for (const [key, stock] of stocksData.entries()) {
            if (key.includes(body.sessionId.slice(-8))) {
              stocksData.delete(key)
              deletedCount++
            }
          }

          return NextResponse.json({
            success: true,
            message: `Session ${body.sessionId.slice(-8)} cleaned up`,
            deletedCount,
            reason: body.reason || "unknown",
          })
        }
      } catch (e) {
        // If no body, continue with normal delete logic
      }

      return NextResponse.json({ error: "Bad request", message: "Stock ID is required" }, { status: 400 })
    }

    const existingStock = stocksData.get(id)
    if (!existingStock) {
      return NextResponse.json({ error: "Not found", message: `Stock with id ${id} not found` }, { status: 404 })
    }

    stocksData.delete(id)

    return NextResponse.json({
      success: true,
      message: `Stock ${id} deleted successfully`,
      deletedData: existingStock,
    })
  } catch (error) {
    console.error("DELETE Error:", error)
    return NextResponse.json({ error: "Internal server error", message: "Failed to delete stock" }, { status: 500 })
  }
}

// PATCH - Ping to keep data alive
export async function PATCH(request: NextRequest) {
  const authError = authorize(request, "PATCH")
  if (authError) return authError

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Bad request", message: "Stock ID is required for ping" }, { status: 400 })
    }

    const existingStock = stocksData.get(id)
    if (!existingStock) {
      return NextResponse.json({ error: "Not found", message: `Stock with id ${id} not found` }, { status: 404 })
    }

    // Update last ping time
    existingStock.lastUpdated = Date.now()
    stocksData.set(id, existingStock)

    return NextResponse.json({
      success: true,
      message: "Stock pinged successfully",
      lastUpdated: new Date(existingStock.lastUpdated).toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", message: "Failed to ping stock" }, { status: 500 })
  }
}
