-- Enable RLS on the agents table (if not already enabled)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert new agents
CREATE POLICY "Allow authenticated users to create agents" ON public.agents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view all agents
CREATE POLICY "Allow authenticated users to view agents" ON public.agents
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update agents
CREATE POLICY "Allow authenticated users to update agents" ON public.agents
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete agents
CREATE POLICY "Allow authenticated users to delete agents" ON public.agents
FOR DELETE USING (auth.role() = 'authenticated'); 