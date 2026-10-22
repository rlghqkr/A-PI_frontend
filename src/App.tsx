import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui';
import { ReferenceDataProvider } from './hooks/useReferenceData';
import { RequestDetailProvider } from './features/request-detail/RequestDetailProvider';
import { MockControlsPanel } from './features/shared/MockControlsPanel';
import { PageSkeleton } from './features/shared/PageSkeleton';

const CustomerUsagePage = lazy(() => import('./pages/customers/CustomerUsagePage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const InternalBudgetPage = lazy(() => import('./pages/internal/InternalBudgetPage'));
const ProjectDetailPage = lazy(() => import('./pages/internal/ProjectDetailPage'));
const ModelsPage = lazy(() => import('./pages/models/ModelsPage'));
const SimulatorPage = lazy(() => import('./pages/simulator/SimulatorPage'));
const SimulationHistoryPage = lazy(() => import('./pages/simulations/SimulationHistoryPage'));
const SimulationDetailPage = lazy(() => import('./pages/simulations/SimulationDetailPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ReferenceDataProvider>
          <RequestDetailProvider>
            <Routes>
              <Route element={<AppShell sidebarFooter={<MockControlsPanel />} />}>
                <Route index element={<Navigate to="/customers" replace />} />
                <Route
                  path="/customers"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <CustomerUsagePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/customers/:customerId"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <CustomerDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/internal"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <InternalBudgetPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/internal/projects/:projectId"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ProjectDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/models"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ModelsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/simulator"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SimulatorPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/simulations"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SimulationHistoryPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/simulations/:simulationId"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SimulationDetailPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/customers" replace />} />
              </Route>
            </Routes>
          </RequestDetailProvider>
        </ReferenceDataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
