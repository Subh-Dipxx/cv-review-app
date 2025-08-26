import React, { useState } from 'react';

const ListResumes = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumes, setResumes] = useState([]);
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch resumes from API
  const fetchResumes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-cvs');
      const data = await response.json();
      // Filter out resumes with empty name or file name
      const validResumes = (data.cvs || []).filter(resume => (resume.name && (resume.fileName || resume.file_name)));
      // Deduplicate by name only
      const seenNames = new Set();
      const uniqueResumes = validResumes.filter(resume => {
        if (seenNames.has(resume.name)) return false;
        seenNames.add(resume.name);
        return true;
      });
      setResumes(uniqueResumes);
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
    setLoading(false);
  };

  // Filter resumes based on job description
  const filterResumes = () => {
    if (!jobDescription) {
      setFilteredResumes(resumes);
      return;
    }
    // Example filter: match jobDescription with recommendedRoles
    const filtered = resumes.filter(resume =>
      resume.recommendedRoles?.some(role =>
        role.toLowerCase().includes(jobDescription.toLowerCase())
      )
    );
    setFilteredResumes(filtered);
  };

  // Handle button click
  const handleListClick = async () => {
    if (resumes.length === 0) {
      await fetchResumes();
      filterResumes();
    } else {
      filterResumes();
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>List Resumes</h2>
      <input
        type="text"
        placeholder="Enter job description to filter"
        value={jobDescription}
        onChange={e => setJobDescription(e.target.value)}
        style={{ marginRight: '1rem', padding: '0.5rem' }}
      />
      <button onClick={handleListClick} style={{ padding: '0.5rem 1rem' }}>
        List
      </button>
      {loading && <p>Loading resumes...</p>}
      <div style={{ marginTop: '2rem' }}>
        <p><strong>Total resumes found:</strong> {filteredResumes.length}</p>
        {filteredResumes.map((resume, idx) => (
          <div key={idx} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <strong>Name:</strong> {resume.name || ''}<br />
            <strong>Years of Experience:</strong> {resume.yearsOfExperience ?? resume.years_of_experience ?? ''}<br />
            <strong>Recommended Roles:</strong> {Array.isArray(resume.recommendedRoles) ? resume.recommendedRoles.join(', ') : (resume.recommended_roles ? resume.recommended_roles.split(',').join(', ') : '')}
          </div>
        ))}
        {filteredResumes.length === 0 && !loading && <p>No resumes found.</p>}
      </div>
    </div>
  );
};

export default ListResumes;
