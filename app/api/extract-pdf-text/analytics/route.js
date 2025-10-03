import { NextResponse } from 'next/server';
import pool from '../../../lib/db.js';

export async function GET() {
  try {
    // Get real data from database - count only unique resumes by filename
    // Use the same deduplication logic as the ListResumes component
    const [totalResult] = await pool.query(`
      SELECT COUNT(DISTINCT file_name) as count 
      FROM cvs 
      WHERE file_name IS NOT NULL AND file_name != ''
    `);
    const totalResumes = totalResult[0].count;
    
    console.log(`Analytics: Found ${totalResumes} unique resumes (deduplicated by filename)`);

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
    // Only use the latest entry for each unique filename
    const [engineerTypesResult] = await pool.query(`
      SELECT recommended_roles, file_name
      FROM cvs c1
      WHERE c1.id = (
        SELECT MAX(c2.id) 
        FROM cvs c2 
        WHERE c2.file_name = c1.file_name 
        AND c2.file_name IS NOT NULL 
        AND c2.file_name != ''
      )
      AND recommended_roles IS NOT NULL 
      AND recommended_roles != '' 
      AND recommended_roles != 'No roles'
    `);

    console.log(`Analytics: Processing ${engineerTypesResult.length} unique resume role distributions`);

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
            // Treat as comma-separated string - convert to objects with role name
            roles = row.recommended_roles.split(',').map(r => ({ role: r.trim(), percent: 50 }));
          }
          
          if (Array.isArray(roles) && roles.length > 0) {
            // Find the role with highest percentage
            let highestRole = null;
            let highestPercent = 0;
            
            roles.forEach(roleItem => {
              const roleName = typeof roleItem === 'string' ? roleItem : roleItem.role;
              const rolePercent = typeof roleItem === 'object' && roleItem.percent ? roleItem.percent : 50;
              
              if (roleName && roleName !== 'No roles' && rolePercent > highestPercent) {
                highestRole = roleName;
                highestPercent = rolePercent;
              }
            });
            
            // Allocate this CV to only the highest percentage role
            if (highestRole) {
              engineerTypes[highestRole] = (engineerTypes[highestRole] || 0) + 1;
            }
          }
        }
      } catch (e) {
        // Skip invalid data
        console.log('Invalid recommended_roles data:', row.recommended_roles);
      }
    });

    // Get recent uploads (last 7 days) using created_at field
    // Only count unique filenames per day (latest entry for each file)
    const [recentUploadsResult] = await pool.query(`
      SELECT 
        DATE_FORMAT(MAX(created_at), '%a') as day_name,
        DATE(created_at) as upload_date,
        COUNT(DISTINCT file_name) as count 
      FROM cvs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND file_name IS NOT NULL 
        AND file_name != ''
      GROUP BY DATE(created_at)
      ORDER BY upload_date
    `);

    const recentUploads = recentUploadsResult.map(row => ({
      date: row.day_name,
      count: row.count
    }));

    // Get processing stats - only count unique filenames
    const [successfulResult] = await pool.query(`
      SELECT COUNT(DISTINCT file_name) as count 
      FROM cvs c1
      WHERE c1.id = (
        SELECT MAX(c2.id) 
        FROM cvs c2 
        WHERE c2.file_name = c1.file_name 
        AND c2.file_name IS NOT NULL 
        AND c2.file_name != ''
      )
      AND name IS NOT NULL AND name != '' AND name != 'Unknown'
      AND recommended_roles IS NOT NULL AND recommended_roles != '' AND recommended_roles != 'No roles'
    `);
    const [failedResult] = await pool.query(`
      SELECT COUNT(DISTINCT file_name) as count 
      FROM cvs c1
      WHERE c1.id = (
        SELECT MAX(c2.id) 
        FROM cvs c2 
        WHERE c2.file_name = c1.file_name 
        AND c2.file_name IS NOT NULL 
        AND c2.file_name != ''
      )
      AND ((name IS NULL OR name = '' OR name = 'Unknown') 
        OR (recommended_roles IS NULL OR recommended_roles = '' OR recommended_roles = 'No roles'))
    `);
    
    console.log(`Analytics: Processing stats - Successful: ${successfulResult[0].count}, Failed: ${failedResult[0].count}`);
    
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
