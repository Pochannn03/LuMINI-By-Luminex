import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/Landing';
import GuardianRegister from './pages/auth/register/GuardianRegistration'



export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/guardian" element={<GuardianRegister />}  />
        {/* <Route path="/parent-dashboard" element={<ParentDashboard />} /> */}

      </Routes>
    </div>
  );
}
