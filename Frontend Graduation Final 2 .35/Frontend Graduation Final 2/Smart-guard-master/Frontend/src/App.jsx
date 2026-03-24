import { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import { authService } from './services/authService'
import './App.css'
import './styles/Theme.css'

// Lazy load pages for better performance
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SignupPending from './pages/SignupPending'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Monitoring from './pages/Monitoring'
import OrganizationStaff from './pages/OrganizationStaff'
import ContactPage from './pages/ContactPage'
import ThemeToggle from './components/ThemeToggle'

/**
 * Main application component with routing
 * Handles navigation between landing page, login, dashboard, and monitoring
 */
// Global AudioContext for alert sounds
let globalAudioContext = null;
let audioInitialized = false;

// Initialize audio context on first user interaction
const initAudioContext = () => {
  if (!audioInitialized) {
    try {
      globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioInitialized = true;
      console.log('✅ AudioContext initialized');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }
};

// Play alert sound using initialized AudioContext
const playAlertSound = () => {
  // Don't try to play if we haven't had user interaction yet
  if (!audioInitialized) {
    return; // Silent fail until user interacts
  }
  
  if (!globalAudioContext) {
    return; // Failed to initialize
  }

  try {
    // Resume context if suspended
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {
        // Ignore resume errors - just don't play sound
      });
    }

    // Only play if context is running
    if (globalAudioContext.state === 'running') {
      const oscillator = globalAudioContext.createOscillator();
      const gainNode = globalAudioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, globalAudioContext.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0, globalAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, globalAudioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, globalAudioContext.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(globalAudioContext.currentTime + 0.5);
    }
  } catch (e) {
    // Silent fail - don't spam console with audio errors
  }
};

// Add global click listener to initialize audio
if (typeof window !== 'undefined') {
  const initAudioOnFirstInteraction = () => {
    initAudioContext();
    window.removeEventListener('click', initAudioOnFirstInteraction);
    window.removeEventListener('keydown', initAudioOnFirstInteraction);
    window.removeEventListener('touchstart', initAudioOnFirstInteraction);
  };
  
  window.addEventListener('click', initAudioOnFirstInteraction);
  window.addEventListener('keydown', initAudioOnFirstInteraction);
  window.addEventListener('touchstart', initAudioOnFirstInteraction);
}

function App() {
  const [events, setEvents] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [isWsConnecting, setIsWsConnecting] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeAlert, setActiveAlert] = useState(null);

  // Handle theme changes at the app root level
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // WebSocket for real-time alerts
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:8001/ws/alerts');
      
      ws.onopen = () => {
        console.log('✅ Global WebSocket connected');
        setWsConnected(true);
        // Clear connection issues if they exist
        setIsWsConnecting(false);
        
        // Send organization to backend when WebSocket connects
        const sendOrganization = async () => {
          try {
            const user = await authService.getCurrentUser();
            console.log('🔍 Frontend - Current user:', user);
            console.log('🔍 Frontend - User organization:', user?.organization);
            console.log('🔍 Frontend - User organization type:', typeof user?.organization);
            console.log('🔍 Frontend - User email:', user?.email);
            console.log('🔍 Frontend - User role:', user?.role);
            
            if (user && user.organization) {
              const message = JSON.stringify({
                type: 'set_organization',
                organization: user.organization
              });
              console.log('🔍 Frontend - Sending message:', message);
              ws.send(message);
              console.log('🏢 Frontend - Sent organization to backend:', user.organization);
              
              // Also set organization via HTTP as fallback
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
                  console.log('✅ HTTP Fallback - Organization set successfully:', user.organization);
                } else {
                  console.error('❌ HTTP Fallback - Failed to set organization:', user.organization);
                }
              } catch (httpError) {
                console.error('❌ HTTP Fallback - Error setting organization:', httpError);
              }
            } else {
              console.log('🔍 Frontend - No user or organization found');
              console.log('🔍 Frontend - User exists:', !!user);
              console.log('🔍 Frontend - Organization exists:', !!user?.organization);
              
              // Try to get user data again if organization is missing
              if (user) {
                console.log('🔄 Frontend - Retrying user data fetch...');
                setTimeout(() => sendOrganization(), 1000);
              }
            }
          } catch (error) {
            console.error('❌ Frontend - Error getting user for organization:', error);
          }
        };
        
        // Send organization after connection
        sendOrganization();
        
        // Periodically refresh organization to ensure backend is in sync
        const organizationRefreshInterval = setInterval(async () => {
          try {
            const user = await authService.getCurrentUser();
            if (user && user.organization) {
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
                console.log('🔄 Periodic organization refresh successful:', user.organization);
              }
            }
          } catch (error) {
            console.error('❌ Periodic organization refresh error:', error);
          }
        }, 30000); // Refresh every 30 seconds
        
        // Cleanup interval on disconnect
        ws.addEventListener('close', () => {
          clearInterval(organizationRefreshInterval);
        });
      };

      
ws.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        console.log('🔔 Alert received:', alert);
        
        // Handle organization confirmation from backend
        if (alert.type === 'organization_set') {
          console.log('✅ Organization confirmed by backend:', alert.organization);
          return; // Don't process as alert
        }

        playAlertSound();

        // 1) Handle backend keys correctly
        const isAbnormal = alert.is_abnormal === true || alert.prediction === "abnormal";
        const confidenceValue = alert.confidence || 0;
        const eventName = alert.event || "Abnormal Behaviour";
        const videoId = alert.video_id || "cam1";

        let severity = "low";
        let statusText = "طبيعي";

        // 2) Set status based on confidence and abnormal status
        if (isAbnormal) {
          if (confidenceValue >= 0.8) {
            severity = "emergency";
            statusText = "حالة طوارئ ⚡";
          } else if (confidenceValue >= 0.5) {
            severity = "high";
            statusText = "خطير جداً ⚠️";
          } else {
            severity = "medium";
            statusText = "تحذير 🔔";
          }
        } else {
          statusText = "طبيعي";
        }

        // Mapping for location names
        const cameraLocations = {
          "cam1": "المدخل الرئيسي",
          "cam2": "المخرج الجانبي",
          "cam3": "موقف السيارات",
          "cam4": "الممر الخلفي"
        };

        const newEvent = {
          id: Date.now(),
          rawTimestamp: alert.timestamp ? new Date(alert.timestamp).getTime() : Date.now(),
          location: cameraLocations[videoId] || 'مدخل الجامعة',
          datetime: new Date(alert.timestamp || Date.now()).toLocaleString('ar-EG', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          }),
          status: statusText,
          confidence: `${(confidenceValue * 100).toFixed(1)}%`,
          modelUsed: 'Keras Model (Real)',
          priority: severity,
          severity: severity
        };

        // Show visual alert toast if it's abnormal and confidence is high enough
        if (isAbnormal && confidenceValue >= 0.161) {
          setActiveAlert({
            ...newEvent,
            eventName: eventName
          });
          
          // Auto-hide alert after 8 seconds
          setTimeout(() => {
            setActiveAlert(prev => {
              if (prev && prev.id === newEvent.id) return null;
              return prev;
            });
          }, 8000);
        }

        setEvents(prev => {
          // Prevent exact duplicate events within a short time window (15 seconds)
          // Compare raw timestamps instead of formatted Arabic strings
          const isDuplicate = prev.some(existingEvent => 
            existingEvent.location === newEvent.location && 
            existingEvent.rawTimestamp && 
            Math.abs(existingEvent.rawTimestamp - newEvent.rawTimestamp) < 15000
          );
          
          if (isDuplicate) {
            console.log('🚫 Skipping duplicate event for UI:', newEvent.location);
            return prev;
          }
          
          return [newEvent, ...prev].slice(0, 50); // Keep last 50 events
        });
      };

      ws.onerror = (error) => {
        console.error('❌ Global WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('🔌 Global WebSocket disconnected. Retrying in 3s...');
        setWsConnected(false);
        setIsWsConnecting(true);
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Calculate unread notifications (pending status)
  const unreadCount = events.filter(e => e.status === 'قيد الانتظار').length;

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app" data-theme={theme}>
        <div className="theme-toggle-fixed">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        <Suspense fallback={<div className="loading-screen">جاري التحميل...</div>}>
          <Routes>
            <Route 
              path="/" 
              element={<LandingPage unreadCount={unreadCount} />} 
            />
            <Route 
              path="/login" 
              element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} 
            />
            <Route 
              path="/signup" 
              element={<SignupPage theme={theme} toggleTheme={toggleTheme} />} 
            />
            <Route 
              path="/signup-pending" 
              element={<SignupPending theme={theme} toggleTheme={toggleTheme} />} 
            />
            <Route 
              path="/dashboard" 
              element={<ProtectedRoute element={<Dashboard events={events} setEvents={setEvents} unreadCount={unreadCount} theme={theme} toggleTheme={toggleTheme} />} />} 
            />
            <Route 
              path="/admin-dashboard" 
              element={<ProtectedRoute element={<AdminDashboard theme={theme} toggleTheme={toggleTheme} />} />} 
            />
            <Route 
              path="/organization-staff" 
              element={<ProtectedRoute element={<OrganizationStaff theme={theme} toggleTheme={toggleTheme} />} />} 
            />
            <Route 
                path="/monitoring" 
                element={<ProtectedRoute element={<Monitoring 
                    events={events} 
                    unreadCount={unreadCount} 
                    wsConnected={wsConnected} 
                    isWsConnecting={isWsConnecting}
                    theme={theme}
                    toggleTheme={toggleTheme}
                  />} />} 
              />
            <Route 
                path="/contact" 
                element={<ContactPage />} 
              />
            {/* Catch all - redirect to login */}
            <Route 
              path="*" 
              element={<Navigate to="/login" replace />} 
            />
          </Routes>
        </Suspense>

        {/* Global Alert Notification Toast */}
        {activeAlert && (
          <div className={`alert-toast-container ${activeAlert.priority}`}>
            <div className="alert-toast">
              <div className="alert-toast-header">
                <span className="alert-icon">🚨</span>
                <span className="alert-title">تنبيه أمني: {activeAlert.eventName}</span>
                <button className="close-btn" onClick={() => setActiveAlert(null)}>×</button>
              </div>
              <div className="alert-toast-body">
                <p><strong>الموقع:</strong> {activeAlert.location}</p>
                <p><strong>نسبة التأكد:</strong> {activeAlert.confidence}</p>
                <p><strong>الحالة:</strong> {activeAlert.status}</p>
                <p className="timestamp">{activeAlert.datetime}</p>
              </div>
              <div className="alert-toast-footer">
                <button onClick={() => {
                  setActiveAlert(null);
                  window.location.href = '/dashboard#events-table';
                }}>مشاهدة التفاصيل</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  )
}

export default App