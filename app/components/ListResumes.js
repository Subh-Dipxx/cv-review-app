import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const ListResumes = () => {
  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [roleCategory, setRoleCategory] = useState('');
  
  // Resume data states
  const [resumes, setResumes] = useState([]);
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null); // Track which CV is being deleted
  
  // Common skills for filter dropdown
  const skillOptions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Angular', 'Vue.js',
    'Java', 'C#', '.NET', 'PHP', 'Ruby', 'SQL', 'AWS', 'Azure', 
    'DevOps', 'Docker', 'Kubernetes', 'Machine Learning', 'AI'
  ];
  
  // Role categories for filter dropdown
  const roleCategories = [
    'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data Science',
    'Product Management', 'Project Management', 'UX/UI Design',
    'QA/Testing', 'Cloud Architecture', 'Security', 'Mobile Development'
  ];

  // Fetch resumes from API - now using the get-processed-cvs endpoint
  // which matches exactly the format used by the Process CV feature
  const fetchResumes = async () => {
    setLoading(true);
    setError('');
    setResumes([]);
    
    try {
      console.log('Fetching processed resumes...');
      const response = await fetch('/api/get-processed-cvs');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Processed resume data received:', data);
      
      // Use the exact same data structure as the Process CV feature
      if (data.processedCVs && Array.isArray(data.processedCVs)) {
        console.log(`Received ${data.processedCVs.length} processed resumes`);
        
        // Very strict deduplication - only keep truly unique entries
        const fileNameMap = new Map();
        
        data.processedCVs.forEach(cv => {
          const filename = cv.pdfName;
          
          // If we haven't seen this filename before or this is a newer entry, keep it
          if (!fileNameMap.has(filename) || cv.id > fileNameMap.get(filename).id) {
            fileNameMap.set(filename, cv);
          }
        });
        
        // Convert map values back to array
        const uniqueResumes = Array.from(fileNameMap.values());
        
        console.log(`Strictly filtered down to ${uniqueResumes.length} unique resumes`);
        setResumes(uniqueResumes);
      } else {
        console.warn('No processed CVs found or invalid format:', data);
        setResumes([]);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
      
      let errorMessage = "Failed to load resumes";
      
      try {
        // Try to parse the error response
        const errorData = await error.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If error can't be parsed as JSON, use the error message directly
        errorMessage = `${errorMessage}: ${error.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setResumes([]);
    }
    setLoading(false);
  };

  // Filter resumes based on filters with ranking
  const filterResumes = () => {
    let filtered = resumes.map(resume => ({
      ...resume,
      relevanceScore: 0 // Initialize relevance score
    }));
    
    // Text search filter with scoring
    if (searchText) {
      const searchTerm = searchText.toLowerCase();
      filtered = filtered.filter(resume => {
        let found = false;
        let score = 0;
        
        // Check name (highest priority)
        if (resume.name && resume.name.toLowerCase().includes(searchTerm)) {
          found = true;
          score += 10; // High score for name match
        }
        
        // Check candidate name (alternative field name)
        if (resume.candidateName && resume.candidateName.toLowerCase().includes(searchTerm)) {
          found = true;
          score += 10;
        }
        
        // Check recommended roles (high priority)
        if (Array.isArray(resume.recommendedRoles) && resume.recommendedRoles.length > 0) {
          const roleMatches = resume.recommendedRoles.filter(role => 
            role.toLowerCase().includes(searchTerm)
          );
          if (roleMatches.length > 0) {
            found = true;
            score += roleMatches.length * 8; // Score based on number of role matches
          }
        }
        
        // Check skills (medium priority)
        if (Array.isArray(resume.skills) && resume.skills.length > 0) {
          const skillMatches = resume.skills.filter(skill => 
            skill.toLowerCase().includes(searchTerm)
          );
          if (skillMatches.length > 0) {
            found = true;
            score += skillMatches.length * 5; // Score based on number of skill matches
          }
        }
        
        // Check summary text (lower priority)
        if (resume.summary && resume.summary.toLowerCase().includes(searchTerm)) {
          found = true;
          score += 2; // Lower score for summary match
        }
        
        // Check role/job title (medium priority)
        if (resume.role && resume.role.toLowerCase().includes(searchTerm)) {
          found = true;
          score += 6;
        }
        
        if (found) {
          resume.relevanceScore += score;
        }
        
        return found;
      });
    }
    
    // Experience level filter with scoring
    if (experienceLevel) {
      filtered = filtered.filter(resume => {
        const years = resume.yearsOfExperience || resume.experience || 0;
        let matches = false;
        let score = 0;
        
        switch (experienceLevel) {
          case 'junior':
            if (years >= 0 && years <= 2) {
              matches = true;
              // Perfect match gets higher score
              score = years === 1 ? 5 : (years === 0 ? 4 : 3);
            }
            break;
          case 'mid':
            if (years >= 3 && years <= 5) {
              matches = true;
              // Perfect match (4 years) gets highest score
              score = years === 4 ? 5 : (years === 3 || years === 5 ? 4 : 3);
            }
            break;
          case 'senior':
            if (years >= 6) {
              matches = true;
              // More experience gets higher score (capped at 10)
              score = Math.min(years - 3, 10);
            }
            break;
          default:
            matches = true;
        }
        
        if (matches) {
          resume.relevanceScore += score;
        }
        
        return matches;
      });
    }
    
    // Skills filter with scoring
    if (selectedSkill) {
      filtered = filtered.filter(resume => {
        let matches = false;
        let score = 0;
        
        // Check if skills is an array
        if (Array.isArray(resume.skills)) {
          const skillMatches = resume.skills.filter(skill => 
            skill.toLowerCase().includes(selectedSkill.toLowerCase())
          );
          if (skillMatches.length > 0) {
            matches = true;
            // Exact match gets higher score
            const exactMatches = skillMatches.filter(skill => 
              skill.toLowerCase() === selectedSkill.toLowerCase()
            );
            score += exactMatches.length * 8 + (skillMatches.length - exactMatches.length) * 5;
          }
        }
        
        // If skills is a string, check if it includes the selected skill
        if (typeof resume.skills === 'string') {
          if (resume.skills.toLowerCase().includes(selectedSkill.toLowerCase())) {
            matches = true;
            // Check for exact match vs partial match
            const skillsArray = resume.skills.toLowerCase().split(',').map(s => s.trim());
            const exactMatch = skillsArray.includes(selectedSkill.toLowerCase());
            score += exactMatch ? 8 : 5;
          }
        }
        
        if (matches) {
          resume.relevanceScore += score;
        }
        
        return matches;
      });
    }
    
    // Role category filter with scoring
    if (roleCategory) {
      filtered = filtered.filter(resume => {
        let matches = false;
        let score = 0;
        
        // Check if recommendedRoles is an array
        if (Array.isArray(resume.recommendedRoles)) {
          const roleMatches = resume.recommendedRoles.filter(role => 
            role.toLowerCase().includes(roleCategory.toLowerCase())
          );
          if (roleMatches.length > 0) {
            matches = true;
            // Exact match gets higher score
            const exactMatches = roleMatches.filter(role => 
              role.toLowerCase() === roleCategory.toLowerCase()
            );
            score += exactMatches.length * 10 + (roleMatches.length - exactMatches.length) * 6;
          }
        }
        
        // Check role/job title
        if (resume.role && resume.role.toLowerCase().includes(roleCategory.toLowerCase())) {
          matches = true;
          const exactMatch = resume.role.toLowerCase() === roleCategory.toLowerCase();
          score += exactMatch ? 10 : 6;
        }
        
        if (matches) {
          resume.relevanceScore += score;
        }
        
        return matches;
        return matches;
      });
    }
    
    // Sort by relevance score (highest first), then by creation date (newest first)
    filtered.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // If scores are equal, sort by date (newest first)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    
    setFilteredResumes(filtered);
  };

  // Delete a CV
  const deleteCv = async (id) => {
    if (!window.confirm('Are you sure you want to delete this CV? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    
    try {
      const response = await fetch(`/api/delete-cv?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete CV: ${response.status}`);
      }
      
      // Successfully deleted
      toast.success('CV deleted successfully');
      
      // Refresh the list
      await fetchResumes();
    } catch (error) {
      console.error('Error deleting CV:', error);
      toast.error(`Failed to delete CV: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle button click
  const handleListClick = async () => {
    await fetchResumes();
  };

  useEffect(() => {
    filterResumes();
  }, [resumes, searchText, experienceLevel, selectedSkill, roleCategory]);
  
  // Don't automatically fetch resumes on component mount
  // User must click the "List" button explicitly

  // Export CVs to CSV
  const exportCsv = async () => {
    try {
      toast.loading('Preparing CSV export...', { id: 'export' });
      
      // The API route will return a CSV file for download
      window.location.href = '/api/export-cvs';
      
      toast.success('Export started! Your download should begin shortly.', { id: 'export' });
    } catch (error) {
      console.error('Error exporting CVs:', error);
      toast.error(`Failed to export CVs: ${error.message}`, { id: 'export' });
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>List Resumes</h2>
        <button 
          onClick={exportCsv} 
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#10b981', 
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
          title="Export all CVs to CSV file"
        >
          <span style={{ fontSize: '1.2rem' }}>📥</span>
          Export to CSV
        </button>
      </div>
      
      {/* Filter and List controls */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        marginBottom: '1rem',
        alignItems: 'center'
      }}>
        {/* Main List button */}
        <button 
          onClick={handleListClick} 
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📋</span>
          {resumes.length === 0 ? 'List All Resumes' : 'Refresh List'}
        </button>
        
        {/* Only show filters after resumes have been loaded */}
        {resumes.length > 0 && (
          <>
            {/* Text search */}
            <input
              type="text"
              placeholder="Search by keyword..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ 
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                flex: '1'
              }}
            />
            
            {/* Experience level dropdown */}
            <select
              value={experienceLevel}
              onChange={e => setExperienceLevel(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: experienceLevel ? '#ebf5ff' : 'white'
              }}
            >
              <option value="">Experience Level</option>
              <option value="junior">Junior (0-2 years)</option>
              <option value="mid">Mid-level (3-5 years)</option>
              <option value="senior">Senior (6+ years)</option>
            </select>
            
            {/* Skills dropdown */}
            <select
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: selectedSkill ? '#ebf5ff' : 'white'
              }}
            >
              <option value="">Select Skill</option>
              {skillOptions.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            
            {/* Role category dropdown */}
            <select
              value={roleCategory}
              onChange={e => setRoleCategory(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: roleCategory ? '#ebf5ff' : 'white'
              }}
            >
              <option value="">Role Category</option>
              {roleCategories.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            
            {/* Clear filters button - only show if any filter is active */}
            {(searchText || experienceLevel || selectedSkill || roleCategory) && (
              <button 
                onClick={() => {
                  setSearchText('');
                  setExperienceLevel('');
                  setSelectedSkill('');
                  setRoleCategory('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            )}
          </>
        )}
      </div>
      {loading && <p>Loading resumes...</p>}
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      <div style={{ marginTop: '2rem' }}>
        {resumes.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Total unique resumes found:</strong> {filteredResumes.length}</p>
            {(searchText || experienceLevel || selectedSkill || roleCategory) && (
              <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
                Results are ranked by relevance to your search criteria
              </p>
            )}
          </div>
        )}
        
        {/* Initial state - no search performed yet */}
        {!loading && error && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            border: '1px dashed #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#b91c1c' }}>Connection Error</h3>
            <p style={{ color: '#7f1d1d', marginBottom: '1.5rem' }}>
              {error}
              <br />Please check your database connection or contact support.
            </p>
            <button 
              onClick={handleListClick} 
              style={{ 
                padding: '0.75rem 2rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}
        
        {!loading && !error && resumes.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Resumes Listed Yet</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Click the "List" button above to display all processed resumes in the system.
              <br />You can then filter and manage them as needed.
            </p>
            <button 
              onClick={handleListClick} 
              style={{ 
                padding: '0.75rem 2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              List All Resumes
            </button>
          </div>
        )}
        
        {/* Display only truly unique resumes */}
        {resumes.length > 0 && (() => {
          // Create an array of unique resumes by filename
          const uniqueFiles = new Set();
          const uniqueResumes = [];
          
          // First pass - collect only unique filenames
          filteredResumes.forEach(resume => {
            if (resume.pdfName && !uniqueFiles.has(resume.pdfName)) {
              uniqueFiles.add(resume.pdfName);
              uniqueResumes.push(resume);
            }
          });
          
          console.log(`Displaying ${uniqueResumes.length} unique resumes`);
          
          // Return the mapped JSX elements
          return uniqueResumes.slice(0, 20).map(resume => {
            console.log(`Displaying resume ${resume.id} - ${resume.pdfName}`);
            return (
            <div key={resume.id} style={{ 
              border: '1px solid #3b82f6', 
              borderRadius: '8px',
              padding: '1.5rem', 
              marginBottom: '1.5rem',
              backgroundColor: '#f0f9ff',
              position: 'relative' 
            }}>
              {/* Delete button */}
              <button 
                onClick={() => deleteCv(resume.id)} 
                disabled={deletingId === resume.id}
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  background: 'transparent', 
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                title="Delete this CV"
              >
                {deletingId === resume.id ? (
                  <span style={{ fontSize: '1.2rem', color: '#888' }}>⏳</span>
                ) : (
                  <span style={{ fontSize: '1.2rem', color: '#ef4444' }}>🗑️</span>
                )}
              </button>
              
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '0.75rem',
                color: '#1e40af',
                paddingRight: '30px', // Make room for the delete button
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>
                  {resume.name || resume.candidateName || resume.pdfName || 'No Name Available'}
                </span>
                {(searchText || experienceLevel || selectedSkill || roleCategory) && resume.relevanceScore > 0 && (
                  <span style={{
                    fontSize: '0.8rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 'normal',
                    marginLeft: '10px'
                  }}>
                    {resume.relevanceScore}★
                  </span>
                )}
              </h3>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Years of Experience:</strong> {
                  resume.yearsOfExperience !== null && resume.yearsOfExperience !== undefined
                  ? `${resume.yearsOfExperience} years` 
                  : (resume.experience !== null && resume.experience !== undefined 
                     ? `${resume.experience} years` 
                     : 'Not specified')
                }
              </div>
              
              <div>
                <strong>Recommended Roles:</strong> {
                  Array.isArray(resume.recommendedRoles) && resume.recommendedRoles.length > 0
                    ? resume.recommendedRoles.join(', ') 
                    : 'Not specified'
                }
              </div>
            </div>
            );
          });
        })()}
        
        {resumes.length > 0 && filteredResumes.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            marginTop: '1rem'
          }}>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              No resumes match your current filters.
              <br />Try adjusting your filter criteria or clear filters to see all resumes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListResumes;
