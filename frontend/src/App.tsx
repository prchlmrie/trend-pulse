import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CommandCenter } from './components/CommandCenter';
import { TrendExplorer } from './components/TrendExplorer';
import { OpportunityFinder } from './components/OpportunityFinder';
import { TrendDetail } from './components/TrendDetail';
import { AiAnalyst } from './components/AiAnalyst';
import { ResellerBlueprint } from './components/ResellerBlueprint';
import { LoginPage } from './pages/LoginPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="dashboard" element={<CommandCenter />} />
        <Route path="trends" element={<TrendExplorer />} />
        <Route path="trends/:id" element={<TrendDetail />} />
        <Route path="opportunities" element={<OpportunityFinder />} />
        <Route path="ai-analyst" element={<AiAnalyst />} />
        <Route path="reseller-blueprint" element={<ResellerBlueprint />} />
      </Route>
    </Routes>
  );
}
