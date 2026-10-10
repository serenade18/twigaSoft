import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import About from '@/pages/About';
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

export default function App() {
  return (
    <>
      <ScrollToHash />
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about-twb-global" element={<About />} />
          <Route path="/about-twb-global.html" element={<Navigate to="/about-twb-global" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
