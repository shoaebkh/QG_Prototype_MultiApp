import { Routes, Route } from 'react-router-dom';
import ServiceHome from './pages/ServiceHome.jsx';
import CaseDetail from './pages/CaseDetail.jsx';

export default function ServiceRoutes() {
  return (
    <Routes>
      <Route index element={<ServiceHome />} />
      <Route path="cases/:caseId" element={<CaseDetail />} />
    </Routes>
  );
}
