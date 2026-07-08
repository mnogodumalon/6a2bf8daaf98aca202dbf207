import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import MitgliederPage from '@/pages/MitgliederPage';
import MitgliederDetailPage from '@/pages/MitgliederDetailPage';
import VeranstaltungenPage from '@/pages/VeranstaltungenPage';
import VeranstaltungenDetailPage from '@/pages/VeranstaltungenDetailPage';
import MitgliedsbeitraegePage from '@/pages/MitgliedsbeitraegePage';
import MitgliedsbeitraegeDetailPage from '@/pages/MitgliedsbeitraegeDetailPage';
import PublicFormMitglieder from '@/pages/public/PublicForm_Mitglieder';
import PublicFormVeranstaltungen from '@/pages/public/PublicForm_Veranstaltungen';
import PublicFormMitgliedsbeitraege from '@/pages/public/PublicForm_Mitgliedsbeitraege';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a2bf8bead7569152b1598a0" element={<PublicFormMitglieder />} />
              <Route path="public/6a2bf8c46c1559e567d5783f" element={<PublicFormVeranstaltungen />} />
              <Route path="public/6a2bf8c369cd76d671de312a" element={<PublicFormMitgliedsbeitraege />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="mitglieder" element={<MitgliederPage />} />
                <Route path="mitglieder/:id" element={<MitgliederDetailPage />} />
                <Route path="veranstaltungen" element={<VeranstaltungenPage />} />
                <Route path="veranstaltungen/:id" element={<VeranstaltungenDetailPage />} />
                <Route path="mitgliedsbeitraege" element={<MitgliedsbeitraegePage />} />
                <Route path="mitgliedsbeitraege/:id" element={<MitgliedsbeitraegeDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
