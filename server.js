const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'subscriptions',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpassword',
});

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'order-service',
    timestamp: new Date().toISOString() 
  });
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, p.publication_name 
      FROM orders o 
      LEFT JOIN products p ON o.product_id = p.id 
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT o.*, p.publication_name 
      FROM orders o 
      LEFT JOIN products p ON o.product_id = p.id 
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Validate product exists and get price
    let product;
    try {
      const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${product_id}`);
      product = productResponse.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(400).json({ error: 'Product not found' });
      }
      console.error('Error validating product:', error);
      return res.status(500).json({ error: 'Failed to validate product' });
    }
    
    // Calculate total price (default to monthly price if available)
    const unitPrice = product.price_per_month || product.price_per_year || 0;
    const total_price = unitPrice * quantity;
    
    const result = await pool.query(
      'INSERT INTO orders (product_id, quantity, total_price, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [product_id, quantity, total_price, 'pending']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get orders by status
app.get('/api/orders/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const result = await pool.query(`
      SELECT o.*, p.publication_name 
      FROM orders o 
      LEFT JOIN products p ON o.product_id = p.id 
      WHERE o.status = $1 
      ORDER BY o.created_at DESC
    `, [status]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Delete order (cancel)
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully', order: result.rows[0] });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM orders');
    res.json({ 
      message: 'Database connection successful', 
      order_count: result.rows[0].count 
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});