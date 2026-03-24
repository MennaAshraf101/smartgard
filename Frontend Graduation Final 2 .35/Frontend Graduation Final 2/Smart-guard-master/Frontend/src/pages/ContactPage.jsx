import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import Footer from '../components/Footer/Footer';
import '../styles/Monitoring.css';
import Navbar from '../components/Navbar/Navbar';

function ContactPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);


  const teamMembers = [
    "أحمد سعد",
    "مروان أشرف",
    "ندى ماهر",
    "رغد هاني",
    "هناء محمود",
    "منة أشرف",
    "أمل أشرف",
    "شروق محمد",
    "هاجر خالد",
    "منة الله السعيد"
  ];

  return (
    <div className="monitoring-page" dir="rtl" lang="ar">
      <Navbar currentPage="contact" />

      {/* --- Hero Section --- */}
      <section className="monitoring-hero">
        <h1 className="monitoring-hero__title">تواصل معنا</h1>
        <p className="monitoring-hero__subtitle">نحن هنا للإجابة على استفساراتكم ودعمكم</p>
      </section>

      <div className="monitoring-content" style={{ marginTop: '3rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {/* Team Section */}
          <div className="camera-card" style={{ padding: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.5rem', textAlign: 'right' }}>فريق العمل</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem' 
            }}>
              {teamMembers.map((member, index) => (
                <div key={index} style={{ 
                  padding: '0.75rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    background: 'var(--accent-primary)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                  }}>{index + 1}</span>
                  <span style={{ fontWeight: '500' }}>{member}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="camera-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'rgba(139, 92, 246, 0.1)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>البريد الإلكتروني</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>لأي استفسارات أو دعم فني، لا تتردد في مراسلتنا</p>
            <a 
              href="mailto:smartguardbnu@gmail.com" 
              style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#8b5cf6', 
                textDecoration: 'none',
                padding: '1rem 2rem',
                background: 'rgba(139, 92, 246, 0.05)',
                borderRadius: '12px',
                border: '1px dashed #8b5cf6'
              }}
            >
              smartguardbnu@gmail.com
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ContactPage;
