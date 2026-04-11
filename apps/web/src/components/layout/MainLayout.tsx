import { useLocation, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}