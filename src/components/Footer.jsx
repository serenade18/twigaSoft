import { Link } from 'react-router-dom';
import FooterSignup from './FooterSignup';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <div className="footer-brand-logos"><img src="/assets/twb-footer-logo.png" alt="TWB Global Tourism" width="140" height="84" /></div>
          <p>Trusted business mobility, market access and concierge support between Africa and the Gulf.<br />People. Opportunities. A Brighter Tomorrow.</p>
          <small>Operated by TWB Global Tourism LLC</small>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <div>
            <strong>Platform</strong>
            <Link to="/#services">Mobility</Link><Link to="/#delegations">Trade Missions</Link><Link to="/#opportunities">Opportunities</Link><Link to="/#events">Summits & Events</Link>
          </div>
          <div>
            <strong>Company</strong>
            <Link to="/about-twb-global">About Us</Link><Link to="/#services">Our Services</Link><Link to="/#events">Updates</Link><a href="#enquiry">Contact Us</a>
          </div>
          <div>
            <strong>Support</strong>
            <a href="#enquiry">Help Centre</a><a href="#enquiry">Business Enquiries</a><a href="#enquiry">Contact Support</a>
          </div>
        </nav>
        <div className="footer-connect">
          <strong>Stay connected</strong>
          <p>Get the latest opportunities and insights.</p>
          <FooterSignup />
          <address className="footer-contact">
            <strong>TWB Global Tourism LLC</strong>
            <span>1002 Al Rigga Business Center<br />Al Rigga Street, Al Rigga<br />Dubai, United Arab Emirates</span>
            <a href="tel:+97145750618">+971 4 575 0618</a>
            <a href="mailto:info@twbprogram.com">info@twbprogram.com</a>
            <a href="https://www.twbprogram.com/" target="_blank" rel="noopener noreferrer">www.twbprogram.com</a>
          </address>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} AFRIGULF Exchange. All rights reserved.</span>
        <span className="footer-tagline"><i aria-hidden="true"></i><span>Africa and the Gulf<br />Greater Together</span></span>
      </div>
    </footer>
  );
}
