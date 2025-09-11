const mysql = require('mysql2/promise');

async function testAnalytics() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'asdfghjkl',
    database: 'cv_review'
  });

  console.log('Testing analytics queries:');
  
  const [total] = await connection.execute('SELECT COUNT(*) as total FROM cvs');
  console.log('Total CVs:', total[0].total);
  
  const [successful] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM cvs 
    WHERE name IS NOT NULL AND name != '' AND name != 'Unknown'
      AND recommended_roles IS NOT NULL AND recommended_roles != '' AND recommended_roles != 'No roles'
  `);
  console.log('Successful processing:', successful[0].count);
  
  const [failed] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM cvs 
    WHERE (name IS NULL OR name = '' OR name = 'Unknown') 
      OR (recommended_roles IS NULL OR recommended_roles = '' OR recommended_roles = 'No roles')
  `);
  console.log('Failed processing:', failed[0].count);
  
  // Check recent uploads
  const [uploads] = await connection.execute(`
    SELECT 
      DATE_FORMAT(created_at, '%a') as day_name,
      DATE(created_at) as upload_date,
      COUNT(*) as count 
    FROM cvs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%a')
    ORDER BY upload_date
  `);
  console.log('Recent uploads:');
  uploads.forEach(row => console.log(`${row.day_name}: ${row.count} uploads`));
  
  await connection.end();
}

testAnalytics().catch(console.error);
