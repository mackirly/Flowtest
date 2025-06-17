// Test login functionality
console.log('Starting direct login test...');

fetch('/core/auth/token/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Login response:', data);
  if (data.access) {
    localStorage.setItem('flowtest_access_token', data.access);
    localStorage.setItem('flowtest_refresh_token', data.refresh);
    
    // Now fetch user profile
    return fetch('/core/users/me/', {
      headers: {
        'Authorization': `Bearer ${data.access}`,
        'Accept': 'application/json'
      }
    });
  }
})
.then(r => r.json())
.then(user => {
  console.log('User profile:', user);
})
.catch(err => {
  console.error('Login error:', err);
});