// Simple script to clear Google Drive cache
console.log('🧹 Clearing Google Drive cache...');

// Since we can't easily import the TypeScript service from a .mjs file,
// we'll use a different approach - we'll make an API call to clear the cache

const response = await fetch('http://localhost:3000/api/admin/clear-cache', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
});

if (response.ok) {
  const result = await response.json();
  console.log('✅ ' + result.message);
} else {
  console.log('❌ Failed to clear cache:', response.status, response.statusText);
}
