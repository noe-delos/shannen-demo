-- Add user_id to agents table
ALTER TABLE public.agents 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to products table  
ALTER TABLE public.products 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL after adding the column (for new records)
-- Note: You may want to set a default user_id for existing records first
-- ALTER TABLE public.agents ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_products_user_id ON public.products(user_id);

-- Update RLS policies for agents table
DROP POLICY IF EXISTS "Users can view agents" ON agents;
DROP POLICY IF EXISTS "Users can insert agents" ON agents;
DROP POLICY IF EXISTS "Users can update agents" ON agents;
DROP POLICY IF EXISTS "Users can delete agents" ON agents;

CREATE POLICY "Users can view their own agents and default agents" ON agents
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own agents" ON agents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON agents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON agents
FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for products table
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

CREATE POLICY "Users can view their own products and default products" ON products
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own products" ON products
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on both tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY; 