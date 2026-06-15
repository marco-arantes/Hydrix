const url = 'https://udnotbddrrpxyppcmouw.supabase.co/rest/v1/events';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbm90YmRkcnJweHlwcGNtb3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTc3NTYsImV4cCI6MjA5NjQ5Mzc1Nn0.VLA1D-ooKvGq3wgpWKKgD3Li-vXoTWSLd8VGsehDZLQ';

const eventToSave = {
  id: '00000000-0000-0000-0000-000000000000',
  date: '2023-01-01',
  time: '12:00',
  observation: 'Test',
  municipality: 'Test',
  lat: 0,
  lng: 0
};

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(eventToSave)
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(console.log)
.catch(console.error);
