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
    'Frontend', 'Backend', 'Full Stack Developer', 'DevOps', 'Data Science',
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

  // Comprehensive skill keywords to search for in resume content
  const skillKeywords = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript',
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'laravel',
    // Databases
    'mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'redis', 'elasticsearch',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'gitlab', 'github',
    // Data Science & AI
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'matplotlib', 'seaborn',
    // Mobile Development
    'android', 'ios', 'react native', 'flutter', 'xamarin',
    // Other Technologies
    'linux', 'windows', 'macos', 'nginx', 'apache', 'elasticsearch', 'spark', 'hadoop'
  ];

  // Extract skills from resume content
  const extractSkillsFromContent = (resume) => {
    const content = (resume.summary || '').toLowerCase();
    const foundSkills = [];
    
    skillKeywords.forEach(skill => {
      if (content.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    // Also include skills from the database if available
    if (resume.skills) {
      let dbSkills = [];
      if (Array.isArray(resume.skills)) {
        dbSkills = resume.skills;
      } else if (typeof resume.skills === 'string') {
        dbSkills = resume.skills.split(',').map(s => s.trim()).filter(s => s);
      }
      // Add unique database skills
      dbSkills.forEach(skill => {
        if (!foundSkills.some(fs => fs.toLowerCase() === skill.toLowerCase())) {
          foundSkills.push(skill.toLowerCase());
        }
      });
    }
    
    return foundSkills;
  };

  // Advanced filter resumes with unbiased percentage-based ranking
  const filterResumes = () => {
    if (!searchText && !experienceLevel && !selectedSkill && !roleCategory) {
      // No filters applied, just sort by date
      const sorted = [...resumes].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setFilteredResumes(sorted);
      return;
    }

    let filtered = resumes.map(resume => {
      let totalScore = 0;
      let maxPossibleScore = 0;
      const matchDetails = {
        textMatch: 0,
        experienceMatch: 0,
        skillMatch: 0,
        roleMatch: 0
      };

      // 1. TEXT SEARCH SCORING (25 points max)
      if (searchText) {
        maxPossibleScore += 25;
        const searchTerm = searchText.toLowerCase();
        let textScore = 0;

        // Name matching (5 points)
        if (resume.name && resume.name.toLowerCase().includes(searchTerm)) {
          textScore += resume.name.toLowerCase() === searchTerm ? 5 : 3;
        }

        // Summary matching (5 points) 
        if (resume.summary && resume.summary.toLowerCase().includes(searchTerm)) {
          textScore += 5;
        }

        // Skills matching (10 points)
        const resumeSkills = extractSkillsFromContent(resume);
        if (resumeSkills.length > 0) {
          const matchingSkills = resumeSkills.filter(skill => 
            skill.toLowerCase().includes(searchTerm)
          );
          if (matchingSkills.length > 0) {
            // Give more weight if candidate has more total skills
            const skillDensity = resumeSkills.length / 10; // Normalize by 10 skills as baseline
            const matchRatio = matchingSkills.length / resumeSkills.length;
            textScore += Math.min(matchRatio * 10 * Math.min(skillDensity, 2), 10);
          }
        }

        // Role matching (5 points)
        if (resume.recommendedRoles) {
          let roles = [];
          if (Array.isArray(resume.recommendedRoles)) {
            roles = resume.recommendedRoles;
          } else if (typeof resume.recommendedRoles === 'string') {
            roles = resume.recommendedRoles.split(',').map(r => r.trim()).filter(r => r);
          }
          
          const matchingRoles = roles.filter(role => 
            role.toLowerCase().includes(searchTerm)
          );
          if (matchingRoles.length > 0) {
            textScore += Math.min((matchingRoles.length / roles.length) * 5, 5);
          }
        }

        totalScore += textScore;
        matchDetails.textMatch = Math.round((textScore / 25) * 100);
      }

      // 2. EXPERIENCE LEVEL SCORING (25 points max)
      if (experienceLevel) {
        maxPossibleScore += 25;
        const years = parseInt(resume.yearsOfExperience || resume.experience || 0);
        let expScore = 0;

        switch (experienceLevel) {
          case 'junior':
            if (years >= 0 && years <= 3) {
              expScore = 25 - Math.abs(years - 1.5) * 5; // Optimal at 1.5 years
            }
            break;
          case 'mid':
            if (years >= 2 && years <= 7) {
              expScore = 25 - Math.abs(years - 4.5) * 3; // Optimal at 4.5 years
            }
            break;
          case 'senior':
            if (years >= 5) {
              expScore = Math.min(15 + years * 2, 25); // Grows with experience
            }
            break;
        }

        totalScore += Math.max(0, expScore);
        matchDetails.experienceMatch = Math.round((Math.max(0, expScore) / 25) * 100);
      }

      // 3. SKILL FILTER SCORING (25 points max)
      if (selectedSkill) {
        maxPossibleScore += 25;
        let skillScore = 0;
        const skillTerm = selectedSkill.toLowerCase();

        const resumeSkills = extractSkillsFromContent(resume);
        
        if (resumeSkills.length > 0) {
          const exactMatches = resumeSkills.filter(skill => 
            skill.toLowerCase() === skillTerm
          );
          const partialMatches = resumeSkills.filter(skill => 
            skill.toLowerCase().includes(skillTerm) && skill.toLowerCase() !== skillTerm
          );
          
          // Bonus for having more total skills (shows broader expertise)
          const skillDensityBonus = Math.min(resumeSkills.length / 5, 2); // Max 2x bonus for 10+ skills
          
          let baseScore = (exactMatches.length * 20) + (partialMatches.length * 10);
          skillScore = Math.min(baseScore * skillDensityBonus, 25);
        }

        totalScore += skillScore;
        matchDetails.skillMatch = Math.round((skillScore / 25) * 100);
      }

      // 4. ROLE CATEGORY SCORING (25 points max)
      if (roleCategory) {
        maxPossibleScore += 25;
        let roleScore = 0;
        const roleTerm = roleCategory.toLowerCase();

        // Check resume content for role-related keywords
        const content = (resume.summary || '').toLowerCase();
        const roleKeywords = {
          'frontend': ['frontend', 'front-end', 'ui', 'user interface', 'react', 'angular', 'vue', 'html', 'css', 'javascript'],
          'backend': ['backend', 'back-end', 'server', 'api', 'database', 'node', 'python', 'java', 'sql'],
          'full stack': ['fullstack', 'full-stack', 'full stack', 'frontend', 'backend', 'react', 'node', 'javascript'],
          'full stack developer': ['fullstack', 'full-stack', 'full stack', 'frontend', 'backend', 'react', 'node', 'javascript'],
          'devops': ['devops', 'docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'jenkins', 'deployment'],
          'data science': ['data science', 'machine learning', 'ai', 'python', 'pandas', 'tensorflow', 'analytics'],
          'mobile development': ['mobile', 'android', 'ios', 'react native', 'flutter', 'app development']
        };

        // Find role-specific keywords in content
        const relevantKeywords = roleKeywords[roleTerm] || [roleTerm];
        let keywordMatches = 0;
        relevantKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            keywordMatches++;
          }
        });

        if (keywordMatches > 0) {
          roleScore = Math.min((keywordMatches / relevantKeywords.length) * 25, 25);
        }

        // Also check database roles if available
        let roles = [];
        if (Array.isArray(resume.recommendedRoles)) {
          roles = resume.recommendedRoles;
        } else if (typeof resume.recommendedRoles === 'string') {
          roles = resume.recommendedRoles.split(',').map(r => r.trim()).filter(r => r);
        }

        if (roles.length > 0) {
          const exactMatches = roles.filter(role => 
            role.toLowerCase().includes(roleTerm)
          );
          
          if (exactMatches.length > 0) {
            const dbRoleScore = Math.min((exactMatches.length / roles.length) * 20, 20);
            roleScore = Math.max(roleScore, dbRoleScore);
          }
        }

        // Also check job title if available
        if (resume.job_title && resume.job_title.toLowerCase().includes(roleTerm)) {
          roleScore = Math.max(roleScore, 20);
        }

        totalScore += roleScore;
        matchDetails.roleMatch = Math.round((roleScore / 25) * 100);
      }

      // Calculate final percentage (0-100%)
      const finalPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

      return {
        ...resume,
        matchPercentage: finalPercentage,
        matchDetails: matchDetails,
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore
      };
    });

    // Filter out resumes with 0% match
    filtered = filtered.filter(resume => resume.matchPercentage > 0);

    // Sort by percentage (highest first), then by total score, then by date
    filtered.sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
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
              <>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
                  Results are ranked by relevance to your search criteria
                </p>
                {(() => {
                  // Use the same logic to get unique resumes with highest percentages
                  const uniqueResumeMap = new Map();
                  filteredResumes.forEach(resume => {
                    if (resume.pdfName) {
                      const existingResume = uniqueResumeMap.get(resume.pdfName);
                      if (!existingResume || (resume.matchPercentage || 0) > (existingResume.matchPercentage || 0)) {
                        uniqueResumeMap.set(resume.pdfName, resume);
                      }
                    }
                  });
                  
                  const uniqueResumes = Array.from(uniqueResumeMap.values());
                  const highestMatch = uniqueResumes.length > 0 ? Math.max(...uniqueResumes.map(r => r.matchPercentage || 0)) : 0;
                  const topCandidate = uniqueResumes.find(r => r.matchPercentage === highestMatch);
                  
                  if (highestMatch > 0 && topCandidate) {
                    return (
                      <div style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #10b981',
                        borderRadius: '6px',
                        padding: '12px',
                        marginTop: '8px',
                        fontSize: '0.9rem'
                      }}>
                        <span style={{ color: '#065f46', fontWeight: 'bold' }}>
                          🏆 Most Eligible: 
                        </span>
                        <span style={{ color: '#047857', marginLeft: '5px' }}>
                          {topCandidate.name || topCandidate.candidateName || topCandidate.pdfName || 'Unknown'} 
                          ({highestMatch}% match)
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
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
          // Create an array of unique resumes by filename, keeping the one with highest percentage
          const uniqueResumeMap = new Map();
          
          // Process each resume and keep only the one with highest percentage for each filename
          filteredResumes.forEach(resume => {
            if (resume.pdfName) {
              const existingResume = uniqueResumeMap.get(resume.pdfName);
              if (!existingResume || (resume.matchPercentage || 0) > (existingResume.matchPercentage || 0)) {
                uniqueResumeMap.set(resume.pdfName, resume);
              }
            }
          });
          
          // Convert map back to array and sort by match percentage
          const uniqueResumes = Array.from(uniqueResumeMap.values()).sort((a, b) => {
            // Sort by match percentage (highest first), then by criteria met, then by date
            if ((b.matchPercentage || 0) !== (a.matchPercentage || 0)) {
              return (b.matchPercentage || 0) - (a.matchPercentage || 0);
            }
            if ((b.metCriteria || 0) !== (a.metCriteria || 0)) {
              return (b.metCriteria || 0) - (a.metCriteria || 0);
            }
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          });
          
          console.log(`Displaying ${uniqueResumes.length} unique resumes`);
          
          // Find the highest match percentage for highlighting
          const highestMatchPercentage = uniqueResumes.length > 0 && (searchText || experienceLevel || selectedSkill || roleCategory)
            ? Math.max(...uniqueResumes.map(resume => resume.matchPercentage || 0))
            : 0;
          
          // Return the mapped JSX elements
          return uniqueResumes.slice(0, 20).map((resume, index) => {
            console.log(`Displaying resume ${resume.id} - ${resume.pdfName}`);
            const isTopCandidate = (searchText || experienceLevel || selectedSkill || roleCategory) && 
                                   resume.matchPercentage === highestMatchPercentage && 
                                   highestMatchPercentage > 0;
            return (
            <div key={resume.id} style={{ 
              border: isTopCandidate ? '3px solid #10b981' : '1px solid #3b82f6', 
              borderRadius: '8px',
              padding: '1.5rem', 
              marginBottom: '1.5rem',
              backgroundColor: isTopCandidate ? '#ecfdf5' : '#f0f9ff',
              position: 'relative',
              boxShadow: isTopCandidate ? '0 10px 25px rgba(16, 185, 129, 0.3)' : 'none',
              transform: isTopCandidate ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}>
              {/* Most Eligible Badge */}
              {isTopCandidate && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  zIndex: 10
                }}>
                  🏆 MOST ELIGIBLE
                </div>
              )}
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
                {(searchText || experienceLevel || selectedSkill || roleCategory) && resume.matchPercentage > 0 && (
                  <span style={{
                    fontSize: '0.9rem',
                    backgroundColor: resume.matchPercentage >= 80 ? '#10b981' : resume.matchPercentage >= 60 ? '#f59e0b' : '#ef4444',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontWeight: 'bold',
                    marginLeft: '10px'
                  }}>
                    {resume.matchPercentage}% Match
                  </span>
                )}
              </h3>
              
              {/* Match Details */}
              {(searchText || experienceLevel || selectedSkill || roleCategory) && resume.matchPercentage > 0 && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '10px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '5px' }}>
                    Match Breakdown ({resume.totalScore}/{resume.maxPossibleScore} points):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '5px' }}>
                    {searchText && resume.matchDetails && resume.matchDetails.textMatch > 0 && (
                      <div>Text Search: <span style={{color: '#10b981', fontWeight: 'bold'}}>{resume.matchDetails.textMatch}%</span></div>
                    )}
                    {experienceLevel && resume.matchDetails && resume.matchDetails.experienceMatch > 0 && (
                      <div>Experience: <span style={{color: '#10b981', fontWeight: 'bold'}}>{resume.matchDetails.experienceMatch}%</span></div>
                    )}
                    {selectedSkill && resume.matchDetails && resume.matchDetails.skillMatch > 0 && (
                      <div>Skill Match: <span style={{color: '#10b981', fontWeight: 'bold'}}>{resume.matchDetails.skillMatch}%</span></div>
                    )}
                    {roleCategory && resume.matchDetails && resume.matchDetails.roleMatch > 0 && (
                      <div>Role Match: <span style={{color: '#10b981', fontWeight: 'bold'}}>{resume.matchDetails.roleMatch}%</span></div>
                    )}
                  </div>
                </div>
              )}
              
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
