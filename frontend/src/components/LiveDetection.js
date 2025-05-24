import React, { useState, useRef, useEffect } from 'react';
import { detectEntryFace, detectExitFace } from '../utils/api';
import { useToast } from '../components/ui/Toaster';
import Button from '../components/ui/Button';

const LiveDetection = () => {
  const { addToast } = useToast();
  const [activeCamera, setActiveCamera] = useState('entry'); // 'entry' yoki 'exit'
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Kamerani yoqish
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      addToast('Camera access error', 'error');
    }
  };

  // Kamerani o'chirish
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Deteksiyani boshlash
  const startDetection = () => {
    setIsDetecting(true);
    setDetectionResult(null);

    intervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 3000); // Har 3 sekundda bir marta tekshirish
  };

  // Deteksiyani to'xtatish
  const stopDetection = () => {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Rasmni olish va yuzni aniqlash
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Video o'lchamlarini olish
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Canvas o'lchamlarini sozlash
    canvas.width = width;
    canvas.height = height;

    // Videoni canvas ga chizish
    context.drawImage(video, 0, 0, width, height);

    // Canvas dan rasm olish
    canvas.toBlob(async (blob) => {
      try {
        // API ga jo'natish
        const detectFunction = activeCamera === 'entry' ? detectEntryFace : detectExitFace;
        const result = await detectFunction(blob);

        setDetectionResult(result);

        // Agar yuz aniqlangan bo'lsa
        if (result.is_recognized) {
          // Yuz atrofida ramka chizish
          if (result.face_location) {
            const [top, right, bottom, left] = result.face_location;
            context.strokeStyle = '#00FF00';
            context.lineWidth = 2;
            context.strokeRect(left, top, right - left, bottom - top);

            // Mijoz ma'lumotlarini ko'rsatish
            context.fillStyle = '#00FF00';
            context.font = '16px Arial';
            context.fillText(`${result.client_name}`, left, top - 10);
          }

          // Muvaffaqiyatli xabar ko'rsatish
          const action = activeCamera === 'entry' ? 'Entry' : 'Exit';
          addToast(`${action} detected: ${result.client_name}`, 'success');
          
          // 3 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopDetection();
          }, 3000);
        }
      } catch (error) {
        console.error('Detection error:', error);
        addToast('Face detection failed', 'error');
      }
    }, 'image/jpeg');
  };

  // Komponent yuklanganida
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      stopDetection();
    };
  }, []);

  // Kamera o'zgartirilganda
  useEffect(() => {
    // Agar deteksiya ishlayotgan bo'lsa, to'xtatib qayta boshlash
    if (isDetecting) {
      stopDetection();
      startDetection();
    }
  }, [activeCamera]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Detection</h1>
        
        <div className="flex space-x-2">
          <Button 
            variant={activeCamera === 'entry' ? 'secondary' : 'outline'} 
            onClick={() => setActiveCamera('entry')}
          >
            Entry Camera
          </Button>
          <Button 
            variant={activeCamera === 'exit' ? 'secondary' : 'outline'} 
            onClick={() => setActiveCamera('exit')}
          >
            Exit Camera
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto rounded-md"
            style={{ maxHeight: '70vh' }}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ display: 'none' }}
          />
          
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
            {activeCamera === 'entry' ? 'Entry Camera' : 'Exit Camera'}
          </div>
          
          {detectionResult?.is_recognized && (
            <div className="absolute bottom-4 left-4 right-4 bg-green-500 bg-opacity-80 text-white p-3 rounded-md">
              <div className="font-bold">{detectionResult.client_name}</div>
              <div className="text-sm">
                {activeCamera === 'entry' ? 'Entry recorded' : 'Exit recorded'} • 
                Confidence: {Math.round(detectionResult.confidence * 100)}%
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          {!isDetecting ? (
            <Button 
              variant="primary" 
              onClick={startDetection}
              className="px-8"
            >
              Start {activeCamera === 'entry' ? 'Entry' : 'Exit'} Detection
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={stopDetection}
              className="px-8"
            >
              Stop Detection
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>Select the camera type (Entry or Exit)</li>
          <li>Click "Start Detection" to begin face recognition</li>
          <li>When a client is detected, their entry or exit will be recorded</li>
          <li>Entry camera records client arrival</li>
          <li>Exit camera records client departure and calculates visit duration</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveDetection; 