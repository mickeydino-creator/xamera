import { HashRouter, Route, Routes } from 'react-router-dom';
import MapPage from './pages/MapPage';
import CameraPage from './pages/CameraPage';
import FavoritesPage from './pages/FavoritesPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/camera/:slug" element={<CameraPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Routes>
    </HashRouter>
  );
}
