const axios = require('axios');
axios.get('http://localhost:3000/api/v1/analytics/metrics/benchmark/export/excel')
  .then(res => console.log('Success:', res.status))
  .catch(err => {
    console.error('Error:', err.response ? err.response.status : err.message);
    if(err.response) console.error(err.response.data);
  });
