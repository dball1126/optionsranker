import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProDashboardPage } from '@/pages/ProDashboardPage';
import { EducationPage } from '@/pages/EducationPage';
import { StrategyBuilderPage } from '@/pages/StrategyBuilderPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { MarketPage } from '@/pages/MarketPage';
import FlowPage from '@/pages/FlowPage';
import RankingPage from '@/pages/RankingPage';
import MarketScannerPage from '@/pages/MarketScannerPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <ProDashboardPage /> : <DashboardPage />
        } />
        <Route path="/dashboard" element={<ProDashboardPage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/strategy-builder" element={<StrategyBuilderPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/scanner" element={<MarketScannerPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/rankings" element={<RankingPage />} />
        <Route path="/flow" element={<FlowPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
