import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CandidateAssessment from './pages/CandidateAssessment';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/assessment" element={<CandidateAssessment />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/" element={<Navigate to="/assessment" replace />} />
    </Routes>
  );
}

export default App;