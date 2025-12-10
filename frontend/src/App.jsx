import { Routes, Route } from 'react-router-dom';
import Login from './pages/LogIn';
import Landing from './pages/Landing';
import Register from './pages/Register';
import ParentRegistration from './pages/auth/ParentRegistration';


export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/parentregister" element={<ParentRegistration />} />
      </Routes>
    </div>
  );
}
