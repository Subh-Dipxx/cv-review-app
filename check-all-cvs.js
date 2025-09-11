const mysql = require('mysql2/promise');

async function checkAllCVs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'asdfghjkl',
    database: 'cv_review'
  });

  const [cvs] = await connection.execute('SELECT * FROM cvs ORDER BY created_at DESC');
  console.log('All CVs in database:');
  cvs.forEach((cv, index) => {
    console.log(`\n--- CV ${index + 1} ---`);
    console.log('ID:', cv.id);
    console.log('File:', cv.file_name);
    console.log('Name:', cv.name);
    console.log('Email:', cv.email);
    console.log('Recommended Roles:', cv.recommended_roles);
    console.log('Created:', cv.created_at);
    console.log('Skills:', cv.skills);
  });
  
  await connection.end();
}

checkAllCVs().catch(console.error);
