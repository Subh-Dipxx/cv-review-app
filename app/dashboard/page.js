'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCVs: 0,
    processedCVs: 0,
    categories: 0
  });
  const [recentCVs, setRecentCVs] = useState([]);
  const [showList, setShowList] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [resumeSummaries, setResumeSummaries] = useState([]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Load dashboard data
    if (user) {
      loadDashboardData();
      fetchResumeSummaries();
    }
  }, [user, loading, router]);

  const loadDashboardData = () => {
    // Mock data for now - replace with actual API calls
    setStats({
      totalCVs: 15,
      processedCVs: 12,
      categories: 5
    });

    setRecentCVs([
      { id: 1, name: 'John_Doe_CV.pdf', status: 'Processed', uploadDate: '2024-01-15' },
      { id: 2, name: 'Jane_Smith_Resume.pdf', status: 'Processing', uploadDate: '2024-01-14' },
      { id: 3, name: 'Mike_Johnson_CV.pdf', status: 'Processed', uploadDate: '2024-01-13' },
    ]);
  };

  // Fetch real resume summaries from backend
  const fetchResumeSummaries = async () => {
    try {
      const res = await fetch('/api/get-cvs');
      if (!res.ok) return;
      const data = await res.json();
      // Only use extracted data, no mock/fabricated data
      setResumeSummaries(data.cvs || []);
    } catch (err) {
      setResumeSummaries([]);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // if (!user) {
  //   return null; // Will redirect to login
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ensure buttons are always visible at the top */}
      <div className="w-full flex justify-center items-center py-8 bg-blue-100 border-b-4 border-blue-500 z-50" style={{ position: 'relative' }}>
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-10 py-4 rounded-2xl font-extrabold text-2xl shadow-xl border-4 border-blue-400 transition-colors duration-200"
          style={{ minWidth: '240px', letterSpacing: '1px', marginRight: '16px' }}
          onClick={() => setShowList((prev) => !prev)}
          id="list-resumes-btn"
        >
          📋 List Resumes
        </button>
        <button
          className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-2xl font-extrabold text-2xl shadow-xl border-4 border-green-400 transition-colors duration-200"
          style={{ minWidth: '120px', letterSpacing: '1px' }}
          onClick={() => alert('List button clicked')}
          id="list-btn"
        >
          List
        </button>
      </div>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CV Review Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📄</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total CVs
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalCVs}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Processed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.processedCVs}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Categories
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.categories}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent CVs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent CVs
              </h3>
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentCVs.map((cv) => (
                    <li key={cv.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-300 rounded-md flex items-center justify-center">
                            <span className="text-gray-600 text-xs">📄</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {cv.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded on {cv.uploadDate}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cv.status === 'Processed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cv.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6">
                <button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  onClick={() => router.push('/upload')}
                >
                  Upload New CV
                </button>
              </div>
            </div>
          </div>

          {/* List Button and Filter Section */}
          {showList && (
            <div className="mb-8">
              <label className="mr-2 font-medium">Filter by Job Role:</label>
              <select
                className="border rounded px-2 py-1"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
              >
                <option value="">All</option>
                {[...new Set(resumeSummaries.map(cv => cv.role || "N/A"))].map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2">Resume Summaries</h4>
                {resumeSummaries.length === 0 ? (
                  <div className="text-gray-500 text-sm">No resumes found.</div>
                ) : (
                  <ul className="space-y-4">
                    {resumeSummaries
                      .filter(cv => !selectedRole || (cv.role || "N/A") === selectedRole)
                      .map(cv => (
                        <li key={cv.id} className="bg-white rounded shadow p-4">
                          <div className="font-bold text-gray-900">{cv.fileName || cv.name || "No Name"}</div>
                          <div className="text-sm text-gray-700">
                            Experience: {cv.experience ?? cv.yearsOfExperience ?? "N/A"} years
                          </div>
                          <div className="text-sm text-gray-700">
                            Recommended Roles: {Array.isArray(cv.recommendedRoles) ? cv.recommendedRoles.join(', ') : "N/A"}
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



