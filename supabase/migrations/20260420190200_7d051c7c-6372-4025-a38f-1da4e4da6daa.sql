-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule settlement every 5 minutes
SELECT cron.schedule(
  'settle-finished-bets',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://id-preview--f20e826f-2feb-44c7-b895-fd837e27da55.lovable.app/hooks/settle',
    headers := '{"Content-Type": "application/json", "Lovable-Context": "cron", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm92Y3hybHhxYWFneXNyYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDE0ODQsImV4cCI6MjA5MjI3NzQ4NH0.wuFb-KtpIZFClhlPO_ZImGduNad30uxpD1AvtG4brBE"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);