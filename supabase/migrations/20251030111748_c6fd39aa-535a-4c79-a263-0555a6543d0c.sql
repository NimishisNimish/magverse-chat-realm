-- Update user to lifetime Pro member
UPDATE profiles
SET is_pro = true
WHERE id = '95a140f9-7fbe-48b3-83ed-e76706092838';

-- Insert manual transaction record for audit trail
INSERT INTO transactions (user_id, amount, status, order_id, payment_id)
VALUES (
  '95a140f9-7fbe-48b3-83ed-e76706092838',
  0.00,
  'completed',
  'MANUAL_ADMIN_UPGRADE',
  'ADMIN_GRANT_' || gen_random_uuid()::text
);