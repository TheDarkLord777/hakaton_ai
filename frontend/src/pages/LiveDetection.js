import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { CameraIcon, UserPlusIcon, ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toaster';
import { detectFace, getRecommendations, detectEntryFace, detectExitFace } from '../utils/api';

const LiveDetection = () => {
  const webcamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(null);
  const [detectedClient, setDetectedClient] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showUnregisteredNotification, setShowUnregisteredNotification] = useState(false);
  const [lastCapturedImage, setLastCapturedImage] = useState(null);
  const [faceDetections, setFaceDetections] = useState({
    registered: null,  // Ro'yxatdan o'tgan mijoz (yashil ramka)
    unregistered: null // Ro'yxatdan o'tmagan mehmon (sariq ramka)
  });
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [recognizedClients, setRecognizedClients] = useState([]);
  const [lastDetectedClientId, setLastDetectedClientId] = useState(null);
  const [lastDetectedVisitorLocation, setLastDetectedVisitorLocation] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Entry kamera uchun
  const [isEntryDetecting, setIsEntryDetecting] = useState(false);
  const [entryDetectionResult, setEntryDetectionResult] = useState(null);
  const entryVideoRef = useRef(null);
  const entryCanvasRef = useRef(null);
  const entryStreamRef = useRef(null);
  const entryIntervalRef = useRef(null);
  
  // Exit kamera uchun
  const [isExitDetecting, setIsExitDetecting] = useState(false);
  const [exitDetectionResult, setExitDetectionResult] = useState(null);
  const exitVideoRef = useRef(null);
  const exitCanvasRef = useRef(null);
  const exitStreamRef = useRef(null);
  const exitIntervalRef = useRef(null);
  
  // Mavjud kameralar ro'yxati
  const [cameras, setCameras] = useState([]);
  const [entryDeviceId, setEntryDeviceId] = useState('');
  const [exitDeviceId, setExitDeviceId] = useState('');
  const [loadingCameras, setLoadingCameras] = useState(false);

  const handleCameraError = useCallback((error) => {
    console.error('Camera error:', error);
    setCameraError('Camera access denied or device not available');
    addToast('Camera access denied or not available. Please check your permissions.', 'error');
  }, [addToast]);

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setCameraError(null);
  }, []);

  const stopCapturing = useCallback(() => {
    if (captureInterval) {
      clearInterval(captureInterval);
      setCaptureInterval(null);
    }
    setIsCapturing(false);
  }, [captureInterval]);

  const isSimilarFaceLocation = (loc1, loc2, threshold = 50) => {
    if (!loc1 || !loc2) return false;
    
    const center1 = {
      x: (loc1[3] + loc1[1]) / 2,
      y: (loc1[0] + loc1[2]) / 2
    };
    
    const center2 = {
      x: (loc2[3] + loc2[1]) / 2,
      y: (loc2[0] + loc2[2]) / 2
    };
    
    const distance = Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + 
      Math.pow(center1.y - center2.y, 2)
    );
    
    return distance < threshold;
  };

  const detectMultipleFaces = async (imageData) => {
    const formData = new FormData();
    formData.append('file', imageData);
    
    try {
      const response = await fetch('/api/face/detect-multiple', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to detect faces');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  };

  const startCapturing = useCallback(() => {
    if (isCapturing || !isCameraReady) return;
    
    setIsCapturing(true);
    
    const interval = setInterval(async () => {
      if (webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          setLastCapturedImage(screenshot);
          try {
            const byteString = atob(screenshot.split(',')[1]);
            const mimeString = screenshot.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            
            try {
              const response = await detectFace(blob);
              
              if (response && response.face_location) {
                // Ishonchlilik darajasi 60% dan kichik bo'lsa, tanilmagan deb hisoblaymiz
                const isConfidentMatch = response.is_recognized && response.confidence >= 60;
                
                // O'zgartirilgan response obyekti
                const processedResponse = {
                  ...response,
                  is_recognized: isConfidentMatch // Faqat 60% dan yuqori bo'lsa, tanilgan deb hisoblaymiz
                };
                
                if (isConfidentMatch) {
                  if (lastDetectedClientId !== response.client_id) {
                    setLastDetectedClientId(response.client_id);
                    setLastDetectedVisitorLocation(null);
                    setDetectedClient(processedResponse);
                    setDetectedFaces([processedResponse]);
                    setRecognizedClients([processedResponse]);
                    
                    setLoadingRecommendations(true);
                    try {
                      const recs = await getRecommendations(response.client_id);
                      setRecommendations(recs);
                    } catch (err) {
                      console.error('Error fetching recommendations:', err);
                      addToast('Failed to fetch recommendations', 'error');
                    } finally {
                      setLoadingRecommendations(false);
                    }
                    
                    addToast('Client recognized!', 'success');
                    stopCapturing();
                  } else {
                    console.log('Same client detected again, ignoring');
                  }
                } else {
                  if (!isSimilarFaceLocation(lastDetectedVisitorLocation, response.face_location)) {
                    setLastDetectedVisitorLocation(response.face_location);
                    setLastDetectedClientId(null);
                    setDetectedFaces([processedResponse]);
                    setRecognizedClients([]);
                    setDetectedClient(null);
                    setRecommendations([]);
                    
                    // Agar yuz aniqlangan, lekin ishonchlilik past bo'lsa
                    if (response.is_recognized && response.confidence < 60) {
                      addToast('Face detected but confidence too low!', 'warning');
                    } else {
                    addToast('New visitor detected!', 'info');
                    }
                    stopCapturing();
                  } else {
                    console.log('Same visitor detected again, ignoring');
                  }
                }
              }
            } catch (error) {
              console.error('Error during face detection:', error);
              addToast('Error during face detection', 'error');
            }
          } catch (error) {
            console.error('Error processing image:', error);
            addToast('Error processing image', 'error');
          }
        }
      }
    }, 3000);
    
    setCaptureInterval(interval);
    addToast('Started face detection', 'info');
    
    return () => {
      clearInterval(interval);
    };
  }, [isCapturing, isCameraReady, addToast, stopCapturing, lastDetectedClientId, lastDetectedVisitorLocation]);

  const restartCapturing = () => {
    setLastDetectedClientId(null);
    setLastDetectedVisitorLocation(null);
    setDetectedClient(null);
    setDetectedFaces([]);
    setRecognizedClients([]);
    setRecommendations([]);
    
    startCapturing();
  };

  useEffect(() => {
    return () => {
      if (captureInterval) {
        clearInterval(captureInterval);
      }
    };
  }, [captureInterval]);

  const handleRegisterNew = () => {
    setShowRegisterModal(true);
  };

  const goToRegistration = () => {
    navigate('/register');
  };

  const handleRegisterSpecificFace = (index, face) => {
    navigate('/register', { 
      state: { 
        fromDetection: true,
        capturedImage: lastCapturedImage,
        faceLocation: face.face_location
      } 
    });
  };

  // Mavjud kameralarni olish
  const getCameras = async () => {
    try {
      setLoadingCameras(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Agar kameralar mavjud bo'lsa, default kameralarni tanlash
      if (videoDevices.length > 0) {
        setEntryDeviceId(videoDevices[0].deviceId);
        
        // Agar ikkinchi kamera mavjud bo'lsa, uni chiqish kamerasi sifatida tanlash
        if (videoDevices.length > 1) {
          setExitDeviceId(videoDevices[1].deviceId);
        } else {
          // Agar faqat bitta kamera bo'lsa, uni ham chiqish kamerasi sifatida tanlash
          setExitDeviceId(videoDevices[0].deviceId);
        }
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      addToast('Failed to get camera list', 'error');
    } finally {
      setLoadingCameras(false);
    }
  };

  // Kirish kamerasini yoqish
  const startEntryCamera = async () => {
    try {
      if (entryStreamRef.current) {
        const tracks = entryStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }

      const constraints = {
        video: {
          deviceId: entryDeviceId ? { exact: entryDeviceId } : undefined
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (entryVideoRef.current) {
        entryVideoRef.current.srcObject = stream;
        entryStreamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing entry camera:', error);
      addToast('Entry camera access error', 'error');
    }
  };

  // Chiqish kamerasini yoqish
  const startExitCamera = async () => {
    try {
      if (exitStreamRef.current) {
        const tracks = exitStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }

      const constraints = {
        video: {
          deviceId: exitDeviceId ? { exact: exitDeviceId } : undefined
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (exitVideoRef.current) {
        exitVideoRef.current.srcObject = stream;
        exitStreamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing exit camera:', error);
      addToast('Exit camera access error', 'error');
    }
  };

  // Kameralarni o'chirish
  const stopCameras = () => {
    // Entry kamerani o'chirish
    if (entryStreamRef.current) {
      const tracks = entryStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      entryStreamRef.current = null;
    }

    if (entryVideoRef.current) {
      entryVideoRef.current.srcObject = null;
    }
    
    // Exit kamerani o'chirish
    if (exitStreamRef.current) {
      const tracks = exitStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      exitStreamRef.current = null;
    }

    if (exitVideoRef.current) {
      exitVideoRef.current.srcObject = null;
    }
  };

  // Kirish deteksiyasini boshlash
  const startEntryDetection = () => {
    setIsEntryDetecting(true);
    setEntryDetectionResult(null);

    entryIntervalRef.current = setInterval(() => {
      captureAndDetectEntry();
    }, 3000); // Har 3 sekundda bir marta tekshirish
  };

  // Chiqish deteksiyasini boshlash
  const startExitDetection = () => {
    setIsExitDetecting(true);
    setExitDetectionResult(null);

    exitIntervalRef.current = setInterval(() => {
      captureAndDetectExit();
    }, 3000); // Har 3 sekundda bir marta tekshirish
  };

  // Kirish deteksiyasini to'xtatish
  const stopEntryDetection = () => {
    setIsEntryDetecting(false);
    if (entryIntervalRef.current) {
      clearInterval(entryIntervalRef.current);
      entryIntervalRef.current = null;
    }
  };

  // Chiqish deteksiyasini to'xtatish
  const stopExitDetection = () => {
    setIsExitDetecting(false);
    if (exitIntervalRef.current) {
      clearInterval(exitIntervalRef.current);
      exitIntervalRef.current = null;
    }
  };

  // Kirish kamerasidan rasmni olish va yuzni aniqlash
  const captureAndDetectEntry = async () => {
    if (!entryVideoRef.current || !entryCanvasRef.current) return;

    const video = entryVideoRef.current;
    const canvas = entryCanvasRef.current;
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
        const result = await detectEntryFace(blob);

        setEntryDetectionResult(result);

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
          addToast(`Entry detected: ${result.client_name}`, 'success');
          
          // 3 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopEntryDetection();
          }, 3000);
        }
      } catch (error) {
        console.error('Entry detection error:', error);
        addToast('Entry face detection failed', 'error');
      }
    }, 'image/jpeg');
  };

  // Chiqish kamerasidan rasmni olish va yuzni aniqlash
  const captureAndDetectExit = async () => {
    if (!exitVideoRef.current || !exitCanvasRef.current) return;

    const video = exitVideoRef.current;
    const canvas = exitCanvasRef.current;
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
        const result = await detectExitFace(blob);

        setExitDetectionResult(result);

        // Agar yuz aniqlangan bo'lsa
        if (result.is_recognized) {
          // Yuz atrofida ramka chizish
          if (result.face_location) {
            const [top, right, bottom, left] = result.face_location;
            context.strokeStyle = '#FF3B30';
            context.lineWidth = 2;
            context.strokeRect(left, top, right - left, bottom - top);

            // Mijoz ma'lumotlarini ko'rsatish
            context.fillStyle = '#FF3B30';
            context.font = '16px Arial';
            context.fillText(`${result.client_name}`, left, top - 10);
          }

          // Muvaffaqiyatli xabar ko'rsatish
          addToast(`Exit detected: ${result.client_name}`, 'success');
          
          // 3 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopExitDetection();
          }, 3000);
        }
      } catch (error) {
        console.error('Exit detection error:', error);
        addToast('Exit face detection failed', 'error');
      }
    }, 'image/jpeg');
  };

  // Kamera o'zgartirilganda
  useEffect(() => {
    if (entryDeviceId) {
      startEntryCamera();
    }
  }, [entryDeviceId]);

  useEffect(() => {
    if (exitDeviceId) {
      startExitCamera();
    }
  }, [exitDeviceId]);

  // Komponent yuklanganida
  useEffect(() => {
    getCameras();

    return () => {
      stopCameras();
      stopEntryDetection();
      stopExitDetection();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Detection System</h1>
      </div>

      {loadingCameras ? (
        <div className="flex items-center justify-center p-10">
          <Spinner size="lg" />
          <span className="ml-3">Loading cameras...</span>
        </div>
      ) : cameras.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No cameras found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please connect a camera to your device and refresh the page.
              </p>
              <div className="mt-6">
                <Button onClick={getCameras}>
                  Refresh Camera List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entry Camera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRightIcon className="w-6 h-6 mr-2 text-green-500" />
                Entry Camera
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Camera
                </label>
                <select
                  value={entryDeviceId}
                  onChange={(e) => setEntryDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800"
                  disabled={isEntryDetecting}
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <video
                  ref={entryVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto rounded-md"
                  style={{ maxHeight: '50vh' }}
                />
                <canvas
                  ref={entryCanvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ display: 'none' }}
                />
                
                <div className="absolute top-4 left-4 bg-green-500 bg-opacity-50 text-white px-3 py-1 rounded-full">
                  Entry
                </div>
                
                {entryDetectionResult?.is_recognized && (
                  <div className="absolute bottom-4 left-4 right-4 bg-green-500 bg-opacity-80 text-white p-3 rounded-md">
                    <div className="font-bold">{entryDetectionResult.client_name}</div>
                    <div className="text-sm">
                      Entry recorded • 
                      Confidence: {Math.round(entryDetectionResult.confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center">
                {!isEntryDetecting ? (
                  <Button 
                    variant="primary" 
                    onClick={startEntryDetection}
                    className="px-8"
                  >
                    Start Entry Detection
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={stopEntryDetection}
                    className="px-8"
                  >
                    Stop Detection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exit Camera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftIcon className="w-6 h-6 mr-2 text-red-500" />
                Exit Camera
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Camera
                </label>
                <select
                  value={exitDeviceId}
                  onChange={(e) => setExitDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800"
                  disabled={isExitDetecting}
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <video
                  ref={exitVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto rounded-md"
                  style={{ maxHeight: '50vh' }}
                />
                <canvas
                  ref={exitCanvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ display: 'none' }}
                />
                
                <div className="absolute top-4 left-4 bg-red-500 bg-opacity-50 text-white px-3 py-1 rounded-full">
                  Exit
                </div>
                
                {exitDetectionResult?.is_recognized && (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-500 bg-opacity-80 text-white p-3 rounded-md">
                    <div className="font-bold">{exitDetectionResult.client_name}</div>
                    <div className="text-sm">
                      Exit recorded • 
                      Confidence: {Math.round(exitDetectionResult.confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center">
                {!isExitDetecting ? (
                  <Button 
                    variant="primary" 
                    onClick={startExitDetection}
                    className="px-8"
                  >
                    Start Exit Detection
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={stopExitDetection}
                    className="px-8"
                  >
                    Stop Detection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Select different cameras for entry and exit if available</li>
            <li>Start entry detection at the entrance door</li>
            <li>Start exit detection at the exit door</li>
            <li>When a client enters, their visit will be recorded</li>
            <li>When a client exits, their visit will be completed and duration calculated</li>
            <li>View visit records and durations in the Visit History page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveDetection; 