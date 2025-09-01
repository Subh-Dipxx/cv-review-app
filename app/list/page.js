'use client';

import React from 'react';
import ListResumes from '../components/ListResumes';
import Link from 'next/link';

export default function ListPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Resume List</h1>
          <Link href="/upload" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Upload New CV
          </Link>
        </div>
        
        <ListResumes />
        
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200 shadow-lg hover:shadow-xl">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
