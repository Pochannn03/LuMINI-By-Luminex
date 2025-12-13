import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Landing from './pages/Landing';
// import Register from './pages/Register';
// import ParentRegistration from './pages/auth/ParentRegistration';
// import ParentDashboard from './pages/ParentDashboard';


export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} />
        <Route path="/parentregister" element={<ParentRegistration />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} /> */}

      </Routes>
    </div>
  );
}
