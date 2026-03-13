-- Add client_id to programs so a program can belong to a specific client.
-- NULL = gym template (reusable across clients)
-- non-NULL = personal program owned by that client
ALTER TABLE programs
  ADD COLUMN client_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Trainers already have full access via created_by = auth.uid().
-- Clients need to read their own personal programs.
CREATE POLICY "clients_read_own_personal_programs" ON programs
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());
