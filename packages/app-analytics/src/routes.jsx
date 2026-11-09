import { Routes, Route } from 'react-router-dom';
import AnalyticsHome from './pages/AnalyticsHome.jsx';

export default function AnalyticsRoutes() {
  return (
    <Routes>
      <Route index element={<AnalyticsHome />} />
    </Routes>
  );
}
