-- Clients may request an arbitrary number of minutes instead of a
-- predefined plan: plan_id becomes optional, requested_minutes carries
-- the custom ask. Exactly one of the two must be present.

ALTER TABLE plan_requests ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE plan_requests ADD COLUMN requested_minutes INT CHECK (requested_minutes > 0);
ALTER TABLE plan_requests
  ADD CONSTRAINT chk_request_source CHECK (plan_id IS NOT NULL OR requested_minutes IS NOT NULL);
