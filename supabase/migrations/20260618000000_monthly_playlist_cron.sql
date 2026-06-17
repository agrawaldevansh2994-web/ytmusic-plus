-- Enable the pg_net and pg_cron extensions if they are not already enabled
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Schedule the generate-monthly-playlist edge function to run at 00:00 on the 1st of every month
select
  cron.schedule(
    'generate-monthly-playlist-job',
    '0 0 1 * *',
    $$
    select
      net.http_post(
        url:='https://wkjbtbcodigujkzmhnse.supabase.co/functions/v1/generate-monthly-playlist',
        headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndramJ0YmNvZGlndWprem1obnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzM0NzIsImV4cCI6MjA5NzAwOTQ3Mn0.PsQWmCNSB6T1B27MQABlcNa_O7K2M9-rbiJKK5_qQaE", "Content-Type": "application/json"}'::jsonb
      );
    $$
  );
