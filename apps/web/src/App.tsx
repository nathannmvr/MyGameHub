import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlatformsPage } from './pages/PlatformsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:id" element={<GameDetailPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
