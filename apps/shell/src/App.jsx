import { Routes, Route } from 'react-router-dom';
import ShellLayout from './layout/ShellLayout.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import AppHost from './AppHost.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<Home />} />
        <Route path="apps/:appId/*" element={<AppHost />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
