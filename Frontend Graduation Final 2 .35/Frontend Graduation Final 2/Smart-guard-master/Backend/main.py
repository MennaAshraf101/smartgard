# backend/main.py
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import os
import json
import csv
import cv2
import asyncio
from typing import List

# Include routers
app = FastAPI(
    title="Abnormal Behavior Detection API",
    version="1.0.0"
)

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"🔍 WebSocket received: '{data}'")
            
            # Handle organization setting from frontend
            try:
                message = json.loads(data)
                print(f"🔍 Parsed message: {message}")
                if message.get('type') == 'set_organization':
                    organization = message.get('organization', 'Smart Guard')
                    global current_organization
                    current_organization = organization
                    print(f"🏢 Organization set via WebSocket: {organization}")
                    print(f"🔍 Global current_organization now: '{current_organization}'")
                    
                    # Send confirmation back to frontend
                    await websocket.send_text(json.dumps({
                        'type': 'organization_set',
                        'organization': organization,
                        'success': True
                    }))
                    continue
            except json.JSONDecodeError as e:
                print(f"🔍 JSON decode error: {e}")
                pass  # Ignore invalid JSON messages
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

from utils.log_converter import csv_to_xlsx

from shared_state import latest_pred  # shared_state
from routers.auth import router as auth_router
from routers.video_stream_router import router as stream_router
from routers.video_router import router as video_router

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"],  # React frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(stream_router)
app.include_router(video_router)

@app.on_event("startup")
async def startup_event():
    import shared_state
    shared_state.loop = asyncio.get_event_loop()
    print("✅ Global event loop initialized in shared_state")

# Shared variable for latest prediction
latest_pred = None

# -----------------------------
# Root endpoint
# -----------------------------
@app.get("/")
def root():
    return {"message": "Backend is running"}

# -----------------------------
# Dashboard endpoint
# -----------------------------
@app.get("/dashboard")
def dashboard():
    import csv
    import sqlite3
    from datetime import datetime, timedelta
    
    try:
        # Read inference logs
        with open("inference_logs.csv", "r") as f:
            reader = csv.DictReader(f)
            all_rows = list(reader)
        
        # Filter for abnormal behavior
        abnormal_events = [row for row in all_rows if row.get("is_abnormal") == "True"]
        
        # Calculate statistics
        total_abnormal = len(abnormal_events)
        
        # Calculate recent abnormal events (last hour)
        one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        recent_abnormal = len([row for row in abnormal_events if row.get("timestamp", "") > one_hour_ago])
        
        # Get latest abnormal events (last 5)
        latest_abnormal = abnormal_events[-5:] if abnormal_events else []

        # Get real user count from local DB
        user_count = 0
        try:
            conn = sqlite3.connect("smartguard.db")
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM users")
            user_count = c.fetchone()[0]
            conn.close()
        except:
            user_count = 15 # Fallback
        
        return {
            "users_online": user_count,
            "total_abnormal_events": total_abnormal,
            "recent_abnormal_events": recent_abnormal,
            "alerts": recent_abnormal,
            "uptime": "12h 45m",
            "system_status": "OK" if recent_abnormal < 5 else "WARNING",
            "latest_abnormal_events": latest_abnormal
        }
    except FileNotFoundError:
        # Return default values if file doesn't exist
        return {
            "users_online": 15,
            "total_abnormal_events": 0,
            "recent_abnormal_events": 0,
            "alerts": 0,
            "uptime": "12h 45m",
            "system_status": "OK",
            "latest_abnormal_events": []
        }
    except Exception as e:
        return {
            "users_online": 15,
            "total_abnormal_events": 0,
            "recent_abnormal_events": 0,
            "alerts": 0,
            "uptime": "12h 45m",
            "system_status": "OK",
            "latest_abnormal_events": [],
            "error": str(e)
        }

# -----------------------------
# Logs download endpoint (abnormal behavior only)
# Support both CSV and XLSX formats
@app.get("/logs")
def logs(format: str = "csv"):
    """Serve inference logs in CSV or XLSX format"""
    try:
        csv_file = "inference_logs.csv"
        xlsx_file = "inference_logs.xlsx"
        
        # Ensure CSV exists
        if not os.path.exists(csv_file):
            with open(csv_file, mode="w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["timestamp", "video_id", "confidence", "threshold", "is_abnormal", 
                                "model_path", "seq_len", "img_size", "saved_video_path", "event"])
        
        # Handle XLSX format request
        if format.lower() == "xlsx":
            # Convert to XLSX if needed
            if not os.path.exists(xlsx_file) or os.path.getmtime(csv_file) > os.path.getmtime(xlsx_file):
                csv_to_xlsx()
            
            if os.path.exists(xlsx_file):
                return FileResponse(
                    path=xlsx_file, 
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    filename="inference_logs.xlsx",
                    headers={"Content-Disposition": "attachment; filename=inference_logs.xlsx"}
                )
        
        # Default to CSV
        if os.path.exists(csv_file):
            return FileResponse(
                path=csv_file,
                media_type="text/csv",
                filename="inference_logs.csv",
                headers={"Content-Disposition": "attachment; filename=inference_logs.csv"}
            )
        
        return {"error": "Log file not found"}
    
    except Exception as e:
        print(f"Error serving logs: {e}")
        return {"error": f"Unable to serve logs file: {str(e)}"}

# -----------------------------
# Live video generator
# -----------------------------

def gen_frames():
    """
    Generator that yields MJPEG frames from the stream processor
    """
    import time
    from services.frame_store import get_jpeg
    
    while True:
        try:
            # Get frame from stream processor
            jpeg_bytes = get_jpeg()
            if jpeg_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
            else:
                # Fallback to camera if no frame from stream processor
                cap = cv2.VideoCapture(0)
                success, frame = cap.read()
                if success:
                    # Overlay latest prediction
                    from shared_state import latest_pred
                    if latest_pred is not None:
                        cv2.putText(frame, f"Pred: {latest_pred}", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if ret:
                        frame_bytes = buffer.tobytes()
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                cap.release()
        except Exception as e:
            print(f"Frame generation error: {e}")
        
        time.sleep(0.033)  # ~30 FPS

# -----------------------------
# Live MJPEG endpoint
# -----------------------------
@app.get("/live")
def live():
    return StreamingResponse(
        gen_frames(),
        media_type='multipart/x-mixed-replace; boundary=frame',
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*"
        }
    )

# -----------------------------
# Endpoint to get latest prediction
# -----------------------------
@app.get("/latest_pred")
def get_latest_pred():
    from shared_state import latest_pred
    return {"prediction": str(latest_pred) if latest_pred else "No prediction yet"}

# Global organization variable
current_organization = "Smart Guard"

@app.post("/set-organization")
async def set_organization(request: Request):
    """Set the current organization for email notifications"""
    try:
        data = await request.json()
        organization = data.get('organization', 'Smart Guard')
        global current_organization
        current_organization = organization
        print(f"🏢 Organization set to: {organization}")
        return {"success": True, "organization": organization}
    except Exception as e:
        print(f"❌ Error setting organization: {e}")
        return {"success": False, "error": str(e)}

@app.get("/get-organization")
async def get_current_organization():
    """Get the current organization"""
    return {"organization": current_organization}

@app.get("/test-organization")
async def test_organization():
    """Test endpoint to check current organization and debug info"""
    global current_organization
    return {
        "current_organization": current_organization,
        "type": str(type(current_organization)),
        "length": len(current_organization) if isinstance(current_organization, str) else None,
        "is_empty": not bool(current_organization),
        "debug": "Organization test endpoint"
    }

@app.post("/test-set-organization")
async def test_set_organization(request: Request):
    """Test endpoint to manually set organization"""
    try:
        data = await request.json()
        organization = data.get('organization', 'Smart Guard')
        global current_organization
        current_organization = organization
        print(f"🧪 TEST - Organization set to: {organization}")
        return {"success": True, "organization": organization, "message": "Test organization set"}
    except Exception as e:
        print(f"❌ Test set organization error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/start-stream-with-organization")
async def start_stream_with_organization(request: Request):
    """Start video stream with specific organization"""
    try:
        data = await request.json()
        organization = data.get('organization', 'Smart Guard')
        
        global current_organization
        current_organization = organization
        print(f"🏢 Stream started with organization: {organization}")
        
        # Start stream processor with the specified organization
        import threading
        import workers.stream_processor as stream_processor
        
        def run_stream():
            stream_processor.process_video_stream(
                video_source=0,  # Default camera
                video_id="cam1",  # Default camera ID
                organization=organization
            )
        
        # Start stream in background thread
        stream_thread = threading.Thread(target=run_stream, daemon=True)
        stream_thread.start()
        
        return {"success": True, "organization": organization, "message": f"Stream started for {organization}"}
        
    except Exception as e:
        print(f"❌ Error starting stream with organization: {e}")
        return {"success": False, "error": str(e)}

# -----------------------------
# Camera Control Endpoints
# -----------------------------
@app.get("/camera/status")
def get_camera_status():
    import shared_state
    return {"enabled": shared_state.camera_enabled}

@app.post("/camera/toggle")
def toggle_camera():
    import shared_state
    try:
        shared_state.camera_enabled = not shared_state.camera_enabled
        print(f"✅ Camera {'enabled' if shared_state.camera_enabled else 'disabled'}")
        return {"enabled": shared_state.camera_enabled, "message": f"Camera {'enabled' if shared_state.camera_enabled else 'disabled'}"}
    except Exception as e:
        print(f"❌ Error toggling camera: {e}")
        return {"error": str(e)}

# -----------------------------
# Test Email Endpoint
# -----------------------------
@app.post("/send-test-email")
async def send_test_email(request: Request):
    try:
        data = await request.json()
        message = data.get('message', 'Test notification from Dashboard')
        notification_type = data.get('type', 'test_email')
        organization = data.get('organization', 'Smart Guard')
        
        print(f"📧 Sending test email: {message}")
        
        # Send actual email using the email service
        from services.email_service import send_abnormal_alert_email
        
        # Create a test alert
        test_confidence = 0.85
        test_video_id = "cam1"
        
        success = await send_abnormal_alert_email(
            confidence=test_confidence,
            video_id=test_video_id,
            event_name=f"Test: {message}",
            organization=organization
        )
        
        if success:
            return {"success": True, "message": "Test email sent successfully"}
        else:
            return {"success": False, "message": "Failed to send test email"}
            
    except Exception as e:
        print(f"❌ Error sending test email: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}

# -----------------------------
# Favicon / Vite support
# -----------------------------
@app.get("/favicon.ico")
def favicon_root():
    return Response(content="", media_type="image/x-icon", status_code=204)

@app.get("/@vite/client")
def vite_client_root():
    return Response(content="", media_type="application/javascript", status_code=200)
