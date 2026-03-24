import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Footer from '../components/Footer/Footer';
import { authService } from '../services/authService';
import { supabaseClient } from '../config/supabaseConfig';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar/Navbar';

function Dashboard({ events, setEvents, unreadCount }) {
  
  const navigate = useNavigate();
  const [activeButton, setActiveButton] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score'); // 'score', 'time', 'location'
  const [selectedRows, setSelectedRows] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [organizationStaffCount, setOrganizationStaffCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('emailNotifications');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [webPushNotifications, setWebPushNotifications] = useState(() => {
    const saved = localStorage.getItem('webPushNotifications');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const fetchUserAndStats = async () => {
      const user = await authService.getCurrentUser();
      
      // Ensure organization is set in backend for email notifications
      if (user && user.organization) {
        try {
          const response = await fetch('http://127.0.0.1:8001/set-organization', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              organization: user.organization
            })
          });
          
          if (response.ok) {
            console.log('✅ Dashboard - Organization set successfully:', user.organization);
          } else {
            console.error('❌ Dashboard - Failed to set organization:', user.organization);
          }
        } catch (error) {
          console.error('❌ Dashboard - Error setting organization:', error);
        }
      }
      
      // Load stored events on component mount
      const storedEvents = getStoredEvents();
      if (storedEvents.length > 0) {
        setEvents(storedEvents);
      }
      
      if (user && user.role?.toLowerCase() === 'admin') {
        try {
          // Get organization name, fetch from Supabase if missing
          let org = user.organization;
          if (!org && user.email) {
            const userData = await supabaseClient.request(`/users?email=eq.${encodeURIComponent(user.email)}`, 'GET');
            if (userData && userData.length > 0) {
              org = userData[0].organization;
              // Update currentUser with organization
              user.organization = org;
            }
          }
          
          setCurrentUser(user);

          if (org) {
            // Using the users table with role filter for security staff
            const staffResponse = await supabaseClient.request(`/users?organization=ilike.${encodeURIComponent(org)}&role=eq.security_man&status=eq.approved`, 'GET');
            if (staffResponse && Array.isArray(staffResponse)) {
              setOrganizationStaffCount(staffResponse.length);
            } else {
              setOrganizationStaffCount(0);
            }
          }
        } catch (err) {
          console.error('Error fetching staff count from Supabase:', err);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(user);
      }
    };
    fetchUserAndStats();
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      saveEventsToStorage(events);
    }
  }, [events]);

  const handleQuickBtnClick = (buttonName) => {
    setActiveButton(activeButton === buttonName ? null : buttonName);
    
    // Handle email notification test
    if (buttonName === 'email') {
      handleSendTestEmail();
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setIsSavingSettings(true);
      setSaveSuccess(false);
      
      // Send test email notification
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test notification from Smart Guard Dashboard',
          type: 'test_email',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('فشل إرسال البريد الإلكتروني التجريبي');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRowSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationClick = () => {
    setShowNotifications(false);
    // Scroll to events table
    const eventsTable = document.querySelector('.events-section');
    if (eventsTable) {
      eventsTable.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Generate unique key for events to handle duplicates
  const getEventKey = (event, index) => {
    if (event.id) {
      // Check if this ID appears multiple times in the events array
      const idCount = events.filter(e => e.id === event.id).length;
      return idCount > 1 ? `${event.id}-${index}` : event.id;
    }
    return `event-${index}`;
  };

  // Save events to localStorage and get last 10
  const saveEventsToStorage = (eventsList) => {
    try {
      localStorage.setItem('securityEvents', JSON.stringify(eventsList));
    } catch (error) {
      console.error('Error saving events to storage:', error);
    }
  };

  const getStoredEvents = () => {
    try {
      const stored = localStorage.getItem('securityEvents');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading stored events:', error);
      return [];
    }
  };

  const getPendingEvents = () => {
    return events.filter(event => event.status === 'قيد الانتظار').slice(0, 5);
  };

  // Get last 10 events for display
  const getLast10Events = () => {
    return Array.isArray(events) ? events.slice(0, 20) : []; // Increased to 20 to show more events
  };

  const handleMarkResolved = () => {
    setEvents(prev => prev.map(e => selectedRows.includes(e.id) ? { ...e, status: "تم الحل ✅" } : e));
    setSelectedRows([]);
  };

  // Helper function to get status class for styling
  const getStatusClass = (status, confidence) => {
    // Special case for resolved status
    if (status && status.includes('تم الحل')) {
      return 'resolved'; // Green badge
    }
    
    // Convert confidence percentage string to number (e.g., "85.0%" -> 0.85)
    const confValue = parseFloat(confidence) / 100 || 0;
    
    if (confValue > 0.8) {
      return 'emergency'; // Red pulsing badge with ⚡ icon
    } else if (confValue > 0.5) {
      return 'danger'; // Orange badge with ⚠️ icon
    } else if (confValue > 0.161) {
      return 'warning'; // Yellow badge with ⚠️ icon
    }
    return 'normal'; // Normal status
  };

  // Helper function to get status icon
  const getStatusIcon = (status, confidence) => {
    // Convert confidence percentage string to number (e.g., "85.0%" -> 0.85)
    const confValue = parseFloat(confidence) / 100 || 0;
    
    // Don't add icons if status already has emojis
    if (status && (status.includes('⚡') || status.includes('⚠️') || status.includes('🔔') || status.includes('✅') || status.includes('⏳'))) {
      return '';
    }
    
    if (confValue > 0.8) {
      return '⚡ '; // Emergency icon
    } else if (confValue > 0.5) {
      return '⚠️ '; // Danger icon
    } else if (confValue > 0.161) {
      return '⚠️ '; // Warning icon
    }
    return ''; // No icon for normal status
  };

  const handleDeleteSelected = () => {
    setEvents(prev => prev.filter(e => !selectedRows.includes(e.id)));
    setSelectedRows([]);
  };

  const handleEscalate = () => {
    console.log('Selected rows:', selectedRows);
    console.log('Current events:', events.map(e => ({ id: e.id, location: e.location })));
    
    setEvents(prev => {
      console.log('Previous events length:', prev.length);
      // Find selected events from the full events array
      const selectedEvents = prev.filter(e => selectedRows.includes(e.id));
      const unselectedEvents = prev.filter(e => !selectedRows.includes(e.id));
      
      console.log('Selected events found:', selectedEvents.length);
      console.log('Unselected events found:', unselectedEvents.length);
      
      // Move selected events to the top, maintaining their relative order
      const newEvents = [...selectedEvents, ...unselectedEvents];
      console.log('New order:', newEvents.map(e => e.id));
      
      return newEvents;
    });
    setSelectedRows([]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all events
      const allEventIds = filteredEvents.map(event => event.id).filter(Boolean);
      setSelectedRows(allEventIds);
    } else {
      // Deselect all events
      setSelectedRows([]);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      setSaveSuccess(false);
      
      // Save settings to localStorage
      const settings = {
        emailNotifications: emailNotifications,
        webPushNotifications: webPushNotifications,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      // Simulate saving process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportLog = async (format = 'csv') => {
    try {
      // Download from backend
      const response = await fetch(`http://127.0.0.1:8001/logs?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download logs');
      }
      
      // Create blob from response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set appropriate filename based on format
      const date = new Date().toISOString().split('T')[0];
      if (format === 'xlsx') {
        link.download = `inference-logs-${date}.xlsx`;
      } else {
        link.download = `inference-logs-${date}.csv`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('فشل في تحميل السجلات. تأكد من اتصالك بالخادم');
    }
  };

  const filteredEvents = getLast10Events().filter(event => {
    if (!searchQuery || searchQuery.trim() === '') {
      return true;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return (
      (event.location && event.location.toLowerCase().includes(query)) ||
      (event.datetime && event.datetime.toLowerCase().includes(query)) ||
      (event.status && event.status.toLowerCase().includes(query)) ||
      (event.confidence && event.confidence.toLowerCase().includes(query)) ||
      (event.modelUsed && event.modelUsed.toLowerCase().includes(query))
    );
  }).sort((a, b) => {
    if (sortBy === 'score') {
      const scoreA = parseFloat(a.confidence) || 0;
      const scoreB = parseFloat(b.confidence) || 0;
      return scoreB - scoreA;
    } else if (sortBy === 'time') {
      return new Date(b.id) - new Date(a.id); // Assuming id is timestamp
    } else if (sortBy === 'location') {
      return a.location.localeCompare(b.location);
    }
    return 0;
  });

  // Handle hash-based scrolling for events table
  useEffect(() => {
    if (window.location.hash === '#events-table') {
      const timeout = setTimeout(() => {
        const eventsTable = document.querySelector('.events-section');
        if (eventsTable) {
          eventsTable.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <div className="dashboard-page">
      <Navbar currentPage="dashboard" showBell={true} unreadCount={unreadCount} />

      {/* --- Hero Section --- */}
      <section className="dashboard-hero">
        <h1 className="dashboard-hero__title">لوحة التحكم</h1>
        <p className="dashboard-hero__subtitle">نظام متقدم للمراقبة وإدارة الإشعارات المدعومة بالذكاء الاصطناعي</p>
      </section>
      
      <div className="dashboard-content">
        
       
        {/* --- Notifications Settings --- */}
        

          
        {/* --- Events Log --- */}
        <h2 className="section-title">سجلات الأحداث والبحث</h2>
        
        {/* Success Message */}
        {saveSuccess && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--status-success-bg)',
            color: 'var(--status-success-text)',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V6a2 2 0 0 1-2-2H5.5a2 2 0 0 1-2 2v5.5l1.54 1.54h6.42V19a2 2 0 0 1-2 2h6.42l1.54 1.54H22a2 2 0 0 1-2 2z" />
                <polyline points="22 12 18 6 12 6" />
              </svg>
              <span>تم حفظ الإعدادات بنجاح</span>
            </div>
          </div>
        )}

        <div className="events-section">
          <div className="search-bar">
            <button className="search-btn">
              <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              بحث
            </button>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <input 
                type="text" 
                className="search-input" 
                placeholder="البحث حسب التاريخ أو الموقع أو الحالة أو النموذج أو الدقة..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <div className="sorting-controls" style={{ marginLeft: 'auto' }}>
              <span className="sorting-label">ترتيب حسب:</span>
              <select 
                className="sorting-select" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="score">الدقة (الأعلى أولاً)</option>
                <option value="time">الوقت (الأحدث أولاً)</option>
                <option value="location">الموقع (أبجدياً)</option>
              </select>
            </div>
          </div>

          {selectedRows.length > 0 && (
            <div className="quick-actions">
              <span className="quick-actions__count">مختارة: {selectedRows.length} أحداث</span>
              <button className="qa-btn qa-btn--resolve" onClick={handleMarkResolved}>✓ تم الحل</button>
              <button className="qa-btn qa-btn--delete" onClick={handleDeleteSelected}>🗑 حذف السجل</button>
            </div>
          )}

          <table className="events-table">
            <thead>
              <tr>
                <th>الموقع</th>
                <th>التاريخ والوقت</th>
                <th>الحالة</th>
                <th>الدقة</th>
                <th>النموذج</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length > 0 ? filteredEvents.map((event, index) => (
                <tr key={getEventKey(event, index)}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(event.id)}
                      onChange={() => handleRowSelect(event.id)}
                    />
                  </td>
                  <td>{event.location}</td>
                  <td>{event.datetime}</td>
                  <td>
                    <span className={`status-badge status-badge--${getStatusClass(event.status, event.confidence)}`}>
                      {getStatusIcon(event.status, event.confidence)}
                      {event.status}
                    </span>
                  </td>
                  <td>{event.confidence || '-'}</td>
                  <td>
                    <span className={`model-tag ${event.severity === 'emergency' ? 'model-tag--emergency' : event.severity === 'high' ? 'model-tag--fight' : 'model-tag--keras'}`}>
                      {event.status === 'طبيعي' ? 'Normal Detection' : 'Abnormal Detection'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="export-log-container">
          <div className="export-dropdown">
            <button className="export-log-btn" onClick={() => handleExportLog('csv')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              حفظ CSV
            </button>
            <button className="export-log-btn" onClick={() => handleExportLog('xlsx')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              حفظ XLSX
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Dashboard;