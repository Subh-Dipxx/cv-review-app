import { NextResponse } from 'next/server';
import pool from '../../lib/db.js';

export async function GET() {
  try {
    // Get real data from database
    const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM cvs');
    const totalResumes = totalResult[0].count;

    // If no data exists, return empty analytics
    if (totalResumes === 0) {
      return NextResponse.json({
        totalResumes: 0,
        engineerTypes: {},
        recentUploads: [],
        processingStats: {
          successful: 0,
          failed: 0,
          pending: 0
        },
        message: "No resumes found in database. Upload some CVs to see analytics."
      });
    }

    // Get engineer types distribution from recommended_roles
    const [engineerTypesResult] = await pool.query(`
      SELECT recommended_roles
      FROM cvs 
      WHERE recommended_roles IS NOT NULL AND recommended_roles != '' AND recommended_roles != 'No roles'
    `);

    const engineerTypes = {};
    engineerTypesResult.forEach(row => {
      try {
        if (row.recommended_roles) {
          let roles = [];
          
          // Check if it's JSON array or comma-separated string
          if (row.recommended_roles.startsWith('[')) {
            // Try to parse as JSON
            roles = JSON.parse(row.recommended_roles);
          } else {
            // Treat as comma-separated string
            roles = row.recommended_roles.split(',').map(r => r.trim());
          }
          
          if (Array.isArray(roles)) {
            roles.forEach(roleItem => {
              const roleName = typeof roleItem === 'string' ? roleItem : roleItem.role;
              if (roleName && roleName !== 'No roles') {
                engineerTypes[roleName] = (engineerTypes[roleName] || 0) + 1;
              }
            });
          }
        }
      } catch (e) {
        // Skip invalid data
        console.log('Invalid recommended_roles data:', row.recommended_roles);
      }
    });

    // Get recent uploads (last 7 days) using created_at field
    const [recentUploadsResult] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%a') as day_name,
        DATE(created_at) as upload_date,
        COUNT(*) as count 
      FROM cvs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%a')
      ORDER BY upload_date
    `);

    const recentUploads = recentUploadsResult.map(row => ({
      date: row.day_name,
      count: row.count
    }));

    // Get processing stats
    const [successfulResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM cvs 
      WHERE name IS NOT NULL AND name != '' AND name != 'Unknown'
        AND recommended_roles IS NOT NULL AND recommended_roles != '' AND recommended_roles != 'No roles'
    `);
    const [failedResult] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM cvs 
      WHERE (name IS NULL OR name = '' OR name = 'Unknown') 
        OR (recommended_roles IS NULL OR recommended_roles = '' OR recommended_roles = 'No roles')
    `);
    
    const analytics = {
      totalResumes,
      engineerTypes,
      recentUploads,
      processingStats: {
        successful: successfulResult[0].count,
        failed: failedResult[0].count,
        pending: 0
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
