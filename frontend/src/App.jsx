import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Setup from './pages/Setup';
import Auction from './pages/Auction';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/auction" element={<Auction />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
