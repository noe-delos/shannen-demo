-- Add CASCADE delete constraints for foreign keys

-- ==== CONVERSATIONS TABLE FOREIGN KEY UPDATES ====

-- Drop existing foreign key constraints
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_product_id_fkey;

ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_agent_id_fkey;

-- Add new foreign key constraints with CASCADE delete
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Note: feedback already has CASCADE delete on conversations via fk_feedback_conversation
-- So when a conversation is deleted, its feedback will also be deleted automatically 