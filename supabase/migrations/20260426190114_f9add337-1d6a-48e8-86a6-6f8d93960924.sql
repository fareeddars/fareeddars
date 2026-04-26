CREATE POLICY "Users can update own expenses"
ON public.expense_categories
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());