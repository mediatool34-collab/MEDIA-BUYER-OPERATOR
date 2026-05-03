import React, { useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { FilterProvider } from './lib/FilterContext';
import { StatePersistenceProvider } from './lib/StatePersistenceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Creatives } from './pages/Creatives';
import { TestingEngine } from './pages/TestingEngine';
import { Strategy } from './pages/Strategy';
import { ExecutionEngine } from './pages/ExecutionEngine';
import { Alerts } from './pages/Alerts';
import { OptimizationLogs } from './pages/OptimizationLogs';
import { Settings } from './pages/Settings';
import { DiagnosisEngine } from './pages/DiagnosisEngine';
import { MarketIntelligence } from './pages/MarketIntelligence';
import { PreFunnelIntelligence } from './pages/PreFunnelIntelligence';
import { LiveAdSpy } from './pages/LiveAdSpy';
import { SystemIntelligence } from './pages/SystemIntelligence';
import { BudgetPlanner } from './pages/BudgetPlanner';

import { PageUnderConstruction } from './components/PageUnderConstruction';

export default function App() {
  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "ad-spy", element: <LiveAdSpy /> },
        { path: "creatives", element: <Creatives /> },
        { path: "campaigns", element: <Campaigns /> },
        { path: "budget", element: <BudgetPlanner /> },
        { path: "scaling", element: <TestingEngine /> },
        { path: "funnel", element: <DiagnosisEngine /> },
        { path: "automation", element: <ExecutionEngine /> },
        { path: "market", element: <MarketIntelligence /> },
        { path: "pre-funnel", element: <PreFunnelIntelligence /> },
        { path: "logs", element: <OptimizationLogs /> },
        { path: "alerts", element: <Alerts /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <PageUnderConstruction title="Module" /> },
      ]
    }
  ], {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    }
  }), []);

  return (
    <AuthProvider>
      <StatePersistenceProvider>
        <FilterProvider>
          <RouterProvider router={router} />
        </FilterProvider>
      </StatePersistenceProvider>
    </AuthProvider>
  );
}

