import type { FormEvent } from 'react';
import DetailDialog from '@/components/DetailDialog';
import EnquiryForm from '@/components/EnquiryForm';
import EventsSection from '@/components/EventsSection';
import HeroSlideshow from '@/components/HeroSlideshow';
import { baseInterestOptions, goals, serviceDetails, services } from '@/data/content';
import usePageMeta from '@/hooks/usePageMeta';
import useScrollZoom from '@/hooks/useScrollZoom';
import { eventDetail } from '@/lib/events';
import type { SiteEvent } from '@/lib/schemas';
import { goToEnquiry } from '@/scroll';
import { useSiteStore } from '@/store/useSiteStore';

const interestOptions = [...baseInterestOptions, 'Other'];

export default function Home() {
  usePageMeta({
    title: 'AFRIGULF Exchange — Move with purpose',
    description: 'AFRIGULF Exchange connects African and UAE businesses through company formation, delegations and purposeful events.',
  });
  useScrollZoom('.opportunity-band, .closing');

  const setInterest = useSiteStore(s => s.setInterest);
  const openDetail = useSiteStore(s => s.openDetail);
  const closeDetail = useSiteStore(s => s.closeDetail);

  const openService = (title: string) => openDetail({ title, ...serviceDetails[title] });
  const openEvent = (event: SiteEvent) => openDetail(eventDetail(event));

  function enquireAbout(title: string) {
    closeDetail();
    if (interestOptions.includes(title)) setInterest(title);
    goToEnquiry();
  }

  function handleGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('goal');
    const goal = goals.find(g => g.value === value);
    if (goal) setInterest(goal.interest);
    goToEnquiry();
  }

  return (
    <>
      <section className="hero" id="top">
        <HeroSlideshow />
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1><span className="hero-move">MOVE</span><br />with PURPOSE.<br /><em>Connect with opportunity.</em></h1>
            <p className="hero-lead">Build your business between Africa and the UAE. Explore company formation, join business exchanges and attend events that connect you with the people and markets you want to reach.</p>
            <div className="hero-actions">
              <a className="button button-gold" href="#enquiry">Start Your Business Journey →</a>
              <a className="button button-outline" href="#events">Explore Events & Delegations</a>
            </div>
            <div className="hero-assurance"><span>♟ &nbsp; People Connections</span><span>▥ &nbsp; Trade Opportunities</span><span>◉ &nbsp; Investment Growth</span></div>
          </div>
        </div>
      </section>

      <section className="intent-wrap container" aria-labelledby="intent-title">
        <form id="goal-form" className="intent-box" onSubmit={handleGoal}>
          <h2 id="intent-title">What do you want to achieve?</h2>
          <div className="intent-options">
            {goals.map((goal, i) => (
              <label key={goal.value}><input type="radio" name="goal" value={goal.value} required={i === 0} /><span>{goal.icon}</span>{goal.value}</label>
            ))}
          </div>
          <button className="button button-gold" type="submit">Continue →</button>
        </form>
      </section>

      <section className="section services" id="services">
        <div className="container">
          <div className="center-heading">
            <p className="eyebrow">OUR SERVICES</p>
            <h2>Your Gateway Between Africa and the UAE</h2>
            <p>Practical solutions, meaningful connections and high-value opportunities for businesses, investors and organisations.</p>
          </div>
          <div className="service-grid">
            {services.map(service => (
              <article key={service.title} className="service-card" onClick={() => openService(service.title)}>
                <div className={`service-image ${service.imageClass}`}><img src={service.image} alt={service.alt} width="1672" height="941" /></div>
                <div className="service-body">
                  <span className="service-icon">{service.icon}</span>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                  <button className="text-button" type="button">Learn More →</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process" id="delegations">
        <div className="container">
          <div className="center-heading"><p className="eyebrow">HOW IT WORKS</p><h2>A Simple Path to Real Opportunities</h2></div>
          <div className="steps">
            <div><b>1</b><strong>Choose your objective</strong><p>Tell us what you want to achieve.</p></div>
            <div><b>2</b><strong>Receive a guided assessment</strong><p>Get tailored information and options.</p></div>
            <div><b>3</b><strong>Connect with the right support</strong><p>We introduce you to relevant expertise.</p></div>
            <div><b>4</b><strong>Move forward with confidence</strong><p>Take the next step with a clear plan.</p></div>
          </div>
        </div>
      </section>

      <EventsSection onOpen={openEvent} />

      <section className="opportunity-band" id="opportunities">
        <div className="container">
          <h2>Where markets meet opportunity</h2>
          <p>A dynamic corridor for trade, investment, talent and innovation.</p>
          <div className="band-grid">
            <div><b>☼</b><strong>Business Formation</strong><span>Turn your ideas into real-world businesses.</span></div>
            <div><b>▥</b><strong>Market Access</strong><span>Reach new customers and strategic partners.</span></div>
            <div><b>♟</b><strong>Purposeful Delegations</strong><span>Join curated missions and build lasting relationships.</span></div>
          </div>
        </div>
      </section>

      <section className="support section" id="about">
        <div className="container">
          <div className="center-heading">
            <h2>Professional support at every stage</h2>
            <p>Services are coordinated through selected professional and appropriately licensed providers.</p>
          </div>
          <div className="support-grid">
            <div><b>●</b><strong>Practical Guidance</strong><span>Clear, relevant information to help you make informed decisions.</span></div>
            <div><b>⌘</b><strong>Introductions to Expertise</strong><span>Access to trusted professional service providers.</span></div>
            <div><b>▤</b><strong>Tailored Options</strong><span>Solutions aligned to your business goals.</span></div>
            <div><b>▣</b><strong>Ongoing Support</strong><span>Continued assistance as your plans progress.</span></div>
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="container">
          <h2>Ready to explore your next opportunity?</h2>
          <p>Let’s connect you to the people, markets and possibilities between Africa and the UAE.</p>
          <a className="button button-gold" href="#enquiry">Start an Enquiry →</a>
          <a className="button button-outline" href="#enquiry">Speak to Our Team</a>
        </div>
      </section>

      <EnquiryForm eyebrow="GET STARTED" submitLabel="Submit enquiry" options={interestOptions} />
      <DetailDialog onEnquire={enquireAbout} />
    </>
  );
}
