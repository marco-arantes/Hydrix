const url = 'https://udnotbddrrpxyppcmouw.supabase.co/rest/v1/events?select=id,event_type_id,date,time,observation,municipality,lat,lng,user_id,event_types(name)';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbm90YmRkcnJweHlwcGNtb3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTc3NTYsImV4cCI6MjA5NjQ5Mzc1Nn0.VLA1D-ooKvGq3wgpWKKgD3Li-vXoTWSLd8VGsehDZLQ';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(console.log)
.catch(console.error);
