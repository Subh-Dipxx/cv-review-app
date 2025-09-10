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

    // Get engineer types distribution
    const [engineerTypesResult] = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM cvs 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `);

    const engineerTypes = {};
    engineerTypesResult.forEach(row => {
      engineerTypes[row.category] = row.count;
    });

    // Get recent uploads (last 7 days)
    const [recentUploadsResult] = await pool.query(`
      SELECT 
        DATE_FORMAT(uploaded_at, '%a') as day_name,
        DATE(uploaded_at) as upload_date,
        COUNT(*) as count 
      FROM cvs 
      WHERE uploaded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(uploaded_at), DATE_FORMAT(uploaded_at, '%a')
      ORDER BY upload_date
    `);

    const recentUploads = recentUploadsResult.map(row => ({
      date: row.day_name,
      count: row.count
    }));

    // Get processing stats
    const [successfulResult] = await pool.query('SELECT COUNT(*) as count FROM cvs WHERE category IS NOT NULL');
    const [failedResult] = await pool.query('SELECT COUNT(*) as count FROM cvs WHERE category IS NULL');
    
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
