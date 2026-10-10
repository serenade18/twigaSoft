import { useEffect, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import EnquiryForm from '@/components/EnquiryForm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { baseInterestOptions } from '@/data/content';
import usePageMeta from '@/hooks/usePageMeta';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { useSiteStore } from '@/store/useSiteStore';

interface AboutService {
  tag: string;
  title: string;
  text: string;
  cta: string;
  interest?: string;
  to?: string;
}

const interestOptions = [...baseInterestOptions, 'Business Travel & Concierge', 'Other'];

const aboutServices: AboutService[] = [
  { tag: '01 / ESTABLISH', title: 'Company Formation Support', text: 'Explore UAE business setup pathways and introductions to licensed specialists suited to your activity and goals.', cta: 'Discuss Company Formation', interest: 'Company Formation' },
  { tag: '02 / CONNECT', title: 'Business Exchange & Delegations', text: 'Define a focused mission, explore target markets and plan relevant partner conversations.', cta: 'Plan a Delegation', interest: 'Business Exchange & Delegations' },
  { tag: '03 / PARTICIPATE', title: 'Summits & Exhibitions', text: 'Explore upcoming gatherings and register your interest in purposeful business and leadership events.', cta: 'Explore Events', to: '/#events' },
  { tag: '04 / EXPERIENCE', title: 'Business Travel & Concierge', text: 'Discuss the practical arrangements and support you need for a focused visit to Dubai.', cta: 'Discuss Your Visit', interest: 'Business Travel & Concierge' },
];

const steps = [
  ['01', 'Share your objective', 'Tell us your target market, goals and preferred timeline.'],
  ['02', 'Discuss suitable options', 'Explore relevant services, introductions and practical considerations with the team.'],
  ['03', 'Agree your next step', 'Clarify the proposed scope and arrangements before proceeding.'],
];

const faqs = [
  ['How do I get started?', 'Share your area of interest and a brief outline of your plans. Your enquiry is saved with a reference number for follow-up.'],
  ['What does company formation support cover?', 'Guidance on available pathways and introductions to appropriately licensed specialists. Specific scope, fees and requirements should be confirmed before proceeding.'],
  ['Can I enquire about a group delegation?', 'Yes. Include your group size, sector, target market and preferred dates so the team can understand your requirements.'],
  ['Are event details confirmed?', 'View the event information on AFRIGULF Exchange and register your interest to receive confirmed participation details when available.'],
];

// Fades .twb-reveal elements in once as they first scroll into view.
function useRevealOnce(rootRef: RefObject<HTMLDivElement>) {
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    document.body.classList.add('twb-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.08 });
    rootRef.current?.querySelectorAll('.twb-reveal').forEach(el => observer.observe(el));
    return () => {
      observer.disconnect();
      document.body.classList.remove('twb-motion');
    };
  }, [rootRef, reducedMotion]);
}

export default function About() {
  usePageMeta({
    title: 'About TWB Global Tourism | AFRIGULF Exchange',
    description: 'Meet TWB Global Tourism LLC, the organisation behind AFRIGULF Exchange. Explore business support, delegations, events and travel between Africa and the UAE.',
    bodyClass: 'twb-page',
  });
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealOnce(rootRef);
  const setInterest = useSiteStore(s => s.setInterest);

  return (
    <div ref={rootRef}>
      <section className="twb-hero" id="top">
        <div className="container">
          <p className="eyebrow">TWB GLOBAL TOURISM · DUBAI</p>
          <h1>Your ambitions.<br /><em>Connected to new markets.</em></h1>
          <p>Business travel, market exploration and purposeful connections between Africa and the UAE.</p>
          <div className="twb-actions">
            <a className="button button-gold" href="#enquiry">Discuss Your Plans</a>
            <a className="button button-outline" href="#twb-services">Explore Our Services</a>
          </div>
          <span className="twb-hero-note">The organisation behind AFRIGULF Exchange</span>
        </div>
      </section>

      <section className="section twb-intro">
        <div className="container twb-split">
          <div className="twb-reveal">
            <p className="eyebrow">PURPOSEFUL CONNECTIONS</p>
            <h2>A clear purpose.<br />A personal approach.</h2>
            <p>TWB Global Tourism LLC connects business ambitions with practical support in Dubai. Through AFRIGULF Exchange, you can explore company formation, business delegations and events that bring Africa and the Gulf closer together.</p>
            <p>Start with your objective. We help clarify suitable options and coordinate relevant introductions and next steps, including support through selected professional and appropriately licensed providers.</p>
            <a className="twb-text-link" href="#enquiry">Tell us what you want to achieve</a>
          </div>
          <figure className="twb-reveal">
            <img src="/assets/business-exchange-clear.png" alt="African and Emirati business representatives in conversation" width="1672" height="941" loading="lazy" />
            <figcaption>People. Opportunities. A Brighter Tomorrow.</figcaption>
          </figure>
        </div>
      </section>

      <section className="section twb-services" id="twb-services">
        <div className="container">
          <div className="center-heading twb-reveal">
            <p className="eyebrow">SUPPORT BUILT AROUND YOUR GOALS</p>
            <h2>What would you like to make possible?</h2>
            <p>Choose your starting point. We’ll help you explore the next step.</p>
          </div>
          <div className="twb-service-grid">
            {aboutServices.map(service => (
              <article key={service.title} className="twb-service twb-reveal">
                <span>{service.tag}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                {service.to
                  ? <Link to={service.to}>{service.cta}</Link>
                  : <a href="#enquiry" onClick={() => setInterest(service.interest!)}>{service.cta}</a>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section twb-platform">
        <div className="container twb-split">
          <div className="twb-reveal">
            <p className="eyebrow">ONE SHARED VISION</p>
            <h2>Discover through AFRIGULF.<br />Connect with TWB.</h2>
            <p>AFRIGULF Exchange is your starting point for exploring opportunities between Africa and the UAE. TWB Global Tourism LLC is the organisation behind the platform, coordinating client support and relevant service connections.</p>
            <Link className="button button-gold" to="/">Explore AFRIGULF Exchange</Link>
          </div>
          <div className="twb-brand-panel twb-reveal">
            <img src="/assets/twb-footer-logo.png" alt="TWB Global Tourism" width="220" loading="lazy" />
            <span>Operates and supports</span>
            <img src="/assets/afrigulf-logo.webp" alt="AFRIGULF Exchange" width="220" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="center-heading twb-reveal"><p className="eyebrow">A CONSIDERED APPROACH</p><h2>Clarity at every step.</h2></div>
          <div className="twb-process">
            {steps.map(([num, title, text]) => (
              <article key={num} className="twb-reveal"><b>{num}</b><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section twb-contact">
        <div className="container twb-split">
          <div className="twb-reveal">
            <p className="eyebrow">REAL PEOPLE. DIRECT CONTACT.</p>
            <h2>Start a conversation<br />with our Dubai team.</h2>
            <p>Have a specific business objective or visit in mind? Contact TWB Global Tourism directly or send your plans using the enquiry form below.</p>
            <address><strong>TWB Global Tourism LLC</strong><br />1002 Al Rigga Business Center<br />Al Rigga Street, Al Rigga<br />Dubai, United Arab Emirates</address>
            <div className="twb-contact-links">
              <a href="tel:+97145750618">+971 4 575 0618</a>
              <a href="mailto:info@twbprogram.com">info@twbprogram.com</a>
              <a href="https://www.twbprogram.com/" target="_blank" rel="noopener noreferrer">Visit TWB Global Tourism</a>
            </div>
          </div>
          <div className="twb-faq twb-reveal">
            <h3>Before we begin</h3>
            <Accordion type="multiple">
              {faqs.map(([question, answer]) => (
                <AccordionItem key={question} value={question} className="border-[#cbd6e4] py-2">
                  <AccordionTrigger className="text-[17px] leading-normal font-bold hover:no-underline">{question}</AccordionTrigger>
                  <AccordionContent><p>{answer}</p></AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <EnquiryForm eyebrow="YOUR NEXT MOVE" submitLabel="Send My Enquiry" options={interestOptions} />
      <a className="twb-mobile-cta" href="#enquiry">Discuss Your Plans</a>
    </div>
  );
}
