import { Outlet } from 'react-router-dom';
import TopNav from './TopNav.jsx';

export default function ShellLayout() {
  return (
    <div>
      <TopNav />
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
