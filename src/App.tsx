import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import RequireAdmin from '@/components/admin/RequireAdmin';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import About from '@/pages/About';
import Dashboard from '@/pages/admin/Dashboard';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Login from '@/pages/auth/Login';
import ResetPassword from '@/pages/auth/ResetPassword';
import Home from '@/pages/Home';

// Scrolls to the #hash target after navigation, or to the top for a new page.
function ScrollToHash() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    // Statement bodies only: newer browsers return a Promise from scroll methods,
    // and React would treat a returned value as the effect's cleanup function.
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, key]);
  return null;
}

function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main"><Outlet /></main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about-twb-global" element={<About />} />
          <Route path="/about-twb-global.html" element={<Navigate to="/about-twb-global" replace />} />
        </Route>
        <Route path="/admin">
          <Route index element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
