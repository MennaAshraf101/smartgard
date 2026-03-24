# backend/services/frame_store.py

latest_jpeg = None
latest_pred = None

def set_jpeg(jpeg_bytes):
    global latest_jpeg
    latest_jpeg = jpeg_bytes

def get_jpeg():
    global latest_jpeg
    if latest_jpeg is None:
        # Return a fallback test image when no camera is available
        import cv2
        import numpy as np
        
        # Create a simple test image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Add some visual content
        cv2.putText(img, 'Camera Feed Unavailable', (150, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(img, 'Backend Running - No Camera', (150, 280), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
        
        # Add a timestamp
        import time
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(img, timestamp, (20, 460), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 255, 100), 2)
        
        # Convert to JPEG
        _, jpeg_bytes = cv2.imencode('.jpg', img)
        return jpeg_bytes.tobytes()
    
    return latest_jpeg

def set_prediction(pred):
    global latest_pred
    latest_pred = pred

def get_prediction():
    return latest_pred
