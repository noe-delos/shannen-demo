-- Complete RLS Policies Migration for all tables

-- ==== PRODUCTS TABLE ====
-- Enable RLS on products table (if not already enabled)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies (CREATE and SELECT should already exist, adding UPDATE and DELETE)
CREATE POLICY "Allow authenticated users to update products" ON public.products
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete products" ON public.products
FOR DELETE USING (auth.role() = 'authenticated');

-- If missing, create INSERT and SELECT policies for products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Allow authenticated users to create products'
    ) THEN
        CREATE POLICY "Allow authenticated users to create products" ON public.products
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Allow authenticated users to view products'
    ) THEN
        CREATE POLICY "Allow authenticated users to view products" ON public.products
        FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ==== CONVERSATIONS TABLE ====
-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies - users can only access their own conversations
CREATE POLICY "Users can insert own conversations" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON public.conversations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
FOR DELETE USING (auth.uid() = user_id);

-- ==== FEEDBACK TABLE ====
-- Enable RLS on feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Feedback policies - users can only access their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedback
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.feedback
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON public.feedback
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback" ON public.feedback
FOR DELETE USING (auth.uid() = user_id); 