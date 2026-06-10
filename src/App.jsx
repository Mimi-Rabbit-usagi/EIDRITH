import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import Learn from './pages/Learn';
import Puzzles from './pages/Puzzles';
import Profile from './pages/Profile';
import LessonPlayer from './pages/LessonPlayer';
import Review from './pages/Review';
import Online from './pages/Online';
import Openings from './pages/Openings';
import Endgame from './pages/Endgame';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<Play />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/learn/:lessonId" element={<LessonPlayer />} />
      <Route path="/puzzles" element={<Puzzles />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/review" element={<Review />} />
      <Route path="/online" element={<Online />} />
      <Route path="/openings" element={<Openings />} />
      <Route path="/endgame" element={<Endgame />} />
    </Routes>
  );
}
