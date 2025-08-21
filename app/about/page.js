export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">About CV Review App</h1>
          <p className="mt-3 text-xl text-gray-500">Simplifying CV analysis with AI technology</p>
        </div>
        
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="prose prose-blue max-w-none">
              <h2>Our Mission</h2>
              <p>
                CV Review App is designed to help recruiters and hiring managers quickly analyze and categorize job applications.
                Using artificial intelligence, our platform automatically extracts key information from CVs and provides insights
                to streamline your hiring process.
              </p>
              
              <h2>Key Features</h2>
              <ul>
                <li><strong>Automated Parsing:</strong> Extract contact details, education, experience, and skills from PDF CVs</li>
                <li><strong>Smart Categorization:</strong> Automatically categorize applicants by job fit and expertise</li>
                <li><strong>Role Matching:</strong> Recommend suitable positions based on candidate qualifications</li>
                <li><strong>Skill Analysis:</strong> Identify and tag technical and soft skills from CV content</li>
                <li><strong>Batch Processing:</strong> Analyze multiple CVs at once for efficient recruitment</li>
              </ul>
              
              <h2>How It Works</h2>
              <p>
                Our application uses advanced natural language processing to understand the content of uploaded CVs.
                The system extracts structured data and applies machine learning algorithms to categorize and analyze
                candidate information. Results are presented in a clean interface that helps you make informed hiring decisions.
              </p>
              
              <h2>Technology Stack</h2>
              <p>
                CV Review App is built with modern technologies including:
              </p>
              <ul>
                <li><strong>Next.js</strong> - React framework for the frontend</li>
                <li><strong>Tailwind CSS</strong> - For styling and responsive design</li>
                <li><strong>MySQL</strong> - Database for storing CV information</li>
                <li><strong>PDF-parse</strong> - For extracting text from PDF documents</li>
                <li><strong>AI/ML Services</strong> - For intelligent analysis of CV content</li>
              </ul>
              
              <h2>Privacy & Security</h2>
              <p>
                We take data privacy seriously. All uploaded CVs and extracted information are processed securely,
                and you maintain full control over your data. We do not share candidate information with third parties
                and implement industry-standard security measures to protect all stored information.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            &copy; 2025 CV Review App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
