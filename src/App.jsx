import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import Learn from './pages/Learn';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<Play />} />
      <Route path="/learn" element={<Learn />} />
    </Routes>
  );
}
