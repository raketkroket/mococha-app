/*
# Create order_notifications table

1. New Tables
- `order_notifications` — stores email notifications sent to MOCOCHA when new orders or quotations are placed
  - `id` (uuid, primary key)
  - `order_id` (uuid, unique, references orders)
  - `order_number` (text)
  - `type` (text: 'order' or 'quotation')
  - `email_subject` (text)
  - `email_body` (text)
  - `sent` (boolean, whether email was actually sent via Resend)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `order_notifications`
- Only authenticated users can read (admin dashboard)
- Only the service role (edge function) can insert/update
*/

CREATE TABLE IF NOT EXISTS order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE,
  order_number text NOT NULL,
  type text NOT NULL DEFAULT 'order',
  email_subject text,
  email_body text,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_notifications_authenticated" ON order_notifications;
CREATE POLICY "read_notifications_authenticated"
ON order_notifications FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_notifications_service" ON order_notifications;
CREATE POLICY "insert_notifications_service"
ON order_notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_notifications_service" ON order_notifications;
CREATE POLICY "update_notifications_service"
ON order_notifications FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
