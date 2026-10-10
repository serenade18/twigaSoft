import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const sectionLinks = [
  { hash: 'top', label: 'Home' },
  { hash: 'services', label: 'Start a Business' },
  { hash: 'opportunities', label: 'Business Exchange' },
  { hash: 'delegations', label: 'Delegations' },
  { hash: 'events', label: 'Summits & Events' },
];

// Highlights the section link for whichever home-page section is under the header.
function useCurrentSection(enabled: boolean) {
  const [current, setCurrent] = useState<string>(sectionLinks[0].hash);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    function update() {
      frame = 0;
      let active = sectionLinks[0].hash;
      sectionLinks.forEach(({ hash }) => {
        const section = document.getElementById(hash);
        if (section && section.getBoundingClientRect().top <= 140) active = hash;
      });
      setCurrent(active);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);
  return [current, setCurrent] as const;
}

export default function Header() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useCurrentSection(isHome);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="nav-wrap container">
        <Link className="brand-lockup" to="/#top" aria-label="AFRIGULF Exchange home">
          <span className="twb-crop"><img src="/assets/twb-logo.webp" alt="TWB Global Tourism" width="120" height="120" /></span>
        </Link>
        <button className="menu-toggle" type="button" aria-label="Open menu" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(o => !o)}>
          <span></span><span></span><span></span>
        </button>
        <nav className={`nav-links${open ? ' open' : ''}`} id="nav-links" aria-label="Main navigation">
          {sectionLinks.map(({ hash, label }) => {
            const isCurrent = isHome && current === hash;
            return (
              <Link key={hash} to={`/#${hash}`} className={isCurrent ? 'is-current' : undefined} aria-current={isCurrent ? 'location' : undefined}
                onClick={() => { close(); setCurrent(hash); }}>
                {label}
              </Link>
            );
          })}
          <NavLink to="/about-twb-global" end onClick={close}>About TWB Global</NavLink>
          <a className="nav-cta" href="#enquiry" onClick={close}>Start an Enquiry <span aria-hidden="true">→</span></a>
        </nav>
      </div>
    </header>
  );
}
