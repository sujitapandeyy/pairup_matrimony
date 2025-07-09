'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Report {
  id: string;
  reported_user: string;
  reason: string;
  proof?: string;
  created_at: string;
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await api.get('/api/reports');
        setReports(res.data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">User Reports</h1>

      {loading ? (
        <p className="text-gray-500">Loading reports...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500 italic">No reports found.</p>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500"
            >
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-semibold text-gray-700">Reported User:</span>{' '}
                {report.reported_user}
              </p>

              <p className="mb-2">
                <span className="font-semibold">Reason:</span> {report.reason}
              </p>

              {report.proof && (
                <div className="mb-3">
                  <span className="font-semibold">Proof:</span>
                  <div className="mt-2">
                    <img
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/reports/${report.proof}`}
                      alt="Proof"
                      className="max-w-xs border rounded-md shadow-sm"
                    />
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-400">
                Submitted on {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
