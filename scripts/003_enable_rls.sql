-- Enable Row Level Security (RLS) for all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (full access for now)
-- In a production environment, you would create more restrictive policies

-- Customers policies
CREATE POLICY "Enable all operations for authenticated users" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

-- Products policies  
CREATE POLICY "Enable all operations for authenticated users" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- Orders policies
CREATE POLICY "Enable all operations for authenticated users" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- Order items policies
CREATE POLICY "Enable all operations for authenticated users" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Inventory transactions policies
CREATE POLICY "Enable all operations for authenticated users" ON inventory_transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow public read access to products (for storefront)
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);
