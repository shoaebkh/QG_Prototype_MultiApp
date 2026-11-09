import { Routes, Route } from 'react-router-dom';
import SalesHome from './pages/SalesHome.jsx';
import LeadDetail from './pages/LeadDetail.jsx';

export default function SalesRoutes() {
  return (
    <Routes>
      <Route index element={<SalesHome />} />
      <Route path="leads/:leadId" element={<LeadDetail />} />
    </Routes>
  );
}
