// Replace with your API endpoint and key
const url = 'https://api.shiplogic.com/pickup-points?search=johannesburg';
const apiKey = 'bba15366d80f4e9996d0bfd0bcee4745';

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));