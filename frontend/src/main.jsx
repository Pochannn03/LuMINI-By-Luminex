import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import SideNavBar from './components/navigation/SideNavBar.jsx';



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SideNavBar />
    </BrowserRouter>
  </StrictMode>,
)

