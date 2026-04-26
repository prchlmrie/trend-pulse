import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CommandCenter } from './components/CommandCenter';
import { TrendExplorer } from './components/TrendExplorer';
import { OpportunityFinder } from './components/OpportunityFinder';
import { TrendDetail } from './components/TrendDetail';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<CommandCenter />} />
          <Route path="trends" element={<TrendExplorer />} />
          <Route path="trends/:id" element={<TrendDetail />} />
          <Route path="opportunities" element={<OpportunityFinder />} />
        </Route>
      </Routes>
    </Router>
  );
}
