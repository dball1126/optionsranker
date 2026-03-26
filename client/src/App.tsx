import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EducationPage } from '@/pages/EducationPage';
import { StrategyBuilderPage } from '@/pages/StrategyBuilderPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { MarketPage } from '@/pages/MarketPage';
import FlowPage from '@/pages/FlowPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/strategy-builder" element={<StrategyBuilderPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/flow" element={<FlowPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
