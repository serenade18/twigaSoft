import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import RequireAdmin from '@/components/admin/RequireAdmin';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import About from '@/pages/About';
import AdminEvents from '@/pages/admin/AdminEvents';
import Dashboard from '@/pages/admin/Dashboard';
import Enquiries from '@/pages/admin/Enquiries';
import Bookings from '@/pages/admin/Bookings';
import CheckIn from '@/pages/admin/CheckIn';
import EventAttendees from '@/pages/admin/EventAttendees';
import EventEditor from '@/pages/admin/EventEditor';
import EventOverview from '@/pages/admin/EventOverview';
import EventPerformance from '@/pages/admin/EventPerformance';
import Staff from '@/pages/admin/Staff';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Login from '@/pages/auth/Login';
import ResetPassword from '@/pages/auth/ResetPassword';
import EventDetail from '@/pages/EventDetail';
import Events from '@/pages/Events';
import Home from '@/pages/Home';
import Tickets from '@/pages/Tickets';

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
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/tickets/:token" element={<Tickets />} />
          <Route path="/about-twb-global" element={<About />} />
          <Route path="/about-twb-global.html" element={<Navigate to="/about-twb-global" replace />} />
        </Route>
        <Route path="/admin">
          <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="events/new" element={<EventEditor />} />
            <Route path="events/:id" element={<EventOverview />}>
              <Route index element={<EventPerformance />} />
              <Route path="attendees" element={<EventAttendees />} />
            </Route>
            <Route path="events/:id/edit" element={<EventEditor />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="staff" element={<Staff />} />
          </Route>
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
