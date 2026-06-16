const axios = require('axios');

async function test() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    // Fetch templates
    const templatesRes = await axios.get('http://localhost:3000/api/v1/academic/teaching-schedule-templates?limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const templates = templatesRes.data.data;
    const inactive = templates.filter(t => t.isActive === false);
    
    console.log(`Total templates: ${templates.length}`);
    console.log(`Inactive templates: ${inactive.length}`);
    if (inactive.length > 0) {
        console.log('Sample inactive template:', inactive[0].id, inactive[0].defaultTeacherId, inactive[0].classSubjectId);
    }
  } catch (err) {
    console.error(err.message);
    if (err.response) console.error(err.response.data);
  }
}
test();
