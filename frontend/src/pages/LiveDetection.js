import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { 
  CameraIcon, 
  UserPlusIcon, 
  ArrowPathIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ChevronRightIcon,
  TruckIcon,
  CurrencyDollarIcon, 
  TagIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toaster';
import { detectFace, getRecommendations, detectEntryFace, detectExitFace, getClient } from '../utils/api';

// Global o'zgaruvchi sifatida tavsiya qilinadigan mashinalar
const FALLBACK_RECOMMENDATIONS = [
  {
    id: 1,
    brand: "Toyota",
    model: "Camry",
    price: 35000,
    year: 2023,
    category: "Sedan",
    interest_score: 85,
    image_url: "https://imageio.forbes.com/specials-images/imageserve/5d35eacaf1176b0008974b54/2020-Toyota-Camry-TRD/0x0.jpg"
  },
  {
    id: 2,
    brand: "Honda",
    model: "CR-V",
    price: 32000,
    year: 2023,
    category: "SUV",
    interest_score: 78,
    image_url: "https://cdn.motor1.com/images/mgl/kXYMm/s1/2020-honda-cr-v-exterior.jpg"
  },
  {
    id: 3,
    brand: "Tesla",
    model: "Model 3",
    price: 45000,
    year: 2023,
    category: "Electric",
    interest_score: 92,
    image_url: "https://cdn.motor1.com/images/mgl/qkxn8/s1/tesla-model-3-2021.jpg"
  }
];

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

  const [recommendedCars, setRecommendedCars] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

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
    setRecommendedCars([]);
    setShowRecommendations(false);

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
    // Tavsiyalarni 30 soniyadan keyin yashirish
    setTimeout(() => {
      setShowRecommendations(false);
    }, 30000);
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

        // 60% confidence level check - muhim qism!
        const isConfidentMatch = result.is_recognized && result.confidence >= 60;
        
        // O'zgartirilgan natija - 60% dan kam bo'lsa tanilmagan deb hisoblanadi
        const processedResult = {
          ...result,
          is_recognized: isConfidentMatch
        };
        
        setEntryDetectionResult(processedResult);

        // Agar yuz aniq tasdiqlangan bo'lsa (60%+ confidence)
        if (isConfidentMatch) {
          // Yuz atrofida ramka chizish
          if (result.face_location) {
            const [top, right, bottom, left] = result.face_location;
            context.strokeStyle = '#00FF00'; // Yashil - tasdiqlangan
            context.lineWidth = 2;
            context.strokeRect(left, top, right - left, bottom - top);

            // Mijoz ma'lumotlarini ko'rsatish
            context.fillStyle = '#00FF00';
            context.font = '16px Arial';
            context.fillText(`${result.client_name}`, left, top - 10);
          }

          // Muvaffaqiyatli xabar ko'rsatish
          addToast(`Client recognized: ${result.client_name} (${Math.round(result.confidence * 100)}%)`, 'success');
          
          // Mijoz to'liq ma'lumotlarini olish
          try {
            const clientData = await getClient(result.client_id);
            // Mavjud natijaga mijoz ma'lumotlarini qo'shish
            setEntryDetectionResult(prev => ({
              ...prev,
              client_data: clientData
            }));
            
            // Mijoz uchun tavsiyalarni olish
            setLoadingRecommendations(true);
            try {
              const recommendations = await getRecommendations(result.client_id);
              setRecommendedCars(recommendations);
              setShowRecommendations(true);
            } catch (error) {
              console.error("Error fetching recommendations:", error);
              
              // Mijoz ma'lumotlariga qarab default tavsiyalar
              let defaultRecs = [...FALLBACK_RECOMMENDATIONS];
              
              // Yoshi bo'yicha
              if (clientData.age < 25) {
                defaultRecs[0].interest_score = 85; // Yoshlar uchun eng yuqori
              } else if (clientData.age >= 40) {
                // Kattalar uchun luxury mashinalar
                defaultRecs = [
                  {
                    id: 4,
                    brand: "Lexus",
                    model: "ES",
                    price: 45000,
                    year: 2023,
                    category: "Luxury",
                    image_url: "https://cdn.motor1.com/images/mgl/P33JQE/s1/2023-bmw-5er-rendering.jpg",
                    interest_score: 85
                  },
                  ...defaultRecs
                ];
              }
              
              // Jinsi bo'yicha
              if (clientData.gender === "Female") {
                // Ayollar uchun fuel efficient mashinalar
                defaultRecs.forEach(car => {
                  if (car.category === "Sedan") {
                    car.interest_score += 5;
                  }
                });
              }
              
              // Budjet bo'yicha
              if (clientData.budget) {
                const budget = clientData.budget;
                defaultRecs = defaultRecs.filter(car => car.price <= budget * 1.1); // Budjetdan 10% ko'p bo'lgan mashinalarni ham ko'rsatish
                
                if (defaultRecs.length === 0) {
                  // Agar hech qanday mashina topilmasa, eng arzonini qo'shish
                  defaultRecs = [FALLBACK_RECOMMENDATIONS[0]];
                }
              }
              
              // Kredit bo'yicha
              if (clientData.has_credit === "No") {
                // Kredit yo'q mijozlar uchun arzon mashinalarni tavsiya qilish
                defaultRecs = defaultRecs.filter(car => car.price < 30000);
                
                if (defaultRecs.length === 0) {
                  // Agar hech qanday mashina topilmasa, eng arzonini qo'shish
                  defaultRecs = [FALLBACK_RECOMMENDATIONS[0]];
                }
              }
              
              setRecommendedCars(defaultRecs);
              setShowRecommendations(true);
              addToast("Using personalized car recommendations", "info");
            } finally {
              setLoadingRecommendations(false);
            }
          } catch (error) {
            console.error("Error fetching client details:", error);
            
            // Xato bo'lganda oddiy mashinalar ro'yxatini ko'rsatish
            setRecommendedCars(FALLBACK_RECOMMENDATIONS);
            setShowRecommendations(true);
          }
          
          // 10 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopEntryDetection();
          }, 10000);
        } 
        // Agar yuz aniqlangan, lekin confidence past bo'lsa (< 60%)
        else if (result.is_recognized && result.confidence < 60) {
          // Yuz atrofida sariq ramka chizish
          if (result.face_location) {
            const [top, right, bottom, left] = result.face_location;
            context.strokeStyle = '#FFA500'; // Sariq - confidence past
            context.lineWidth = 2;
            context.strokeRect(left, top, right - left, bottom - top);
            
            // Xabar
            context.fillStyle = '#FFA500';
            context.font = '16px Arial';
            context.fillText(`Unconfirmed (${Math.round(result.confidence * 100)}%)`, left, top - 10);
          }
          
          // Xabar ko'rsatish
          addToast(`Face detected but confidence too low (${Math.round(result.confidence * 100)}%)`, 'warning');
          
          // Default mashinalar tavsiyasini ko'rsatish
          setRecommendedCars(FALLBACK_RECOMMENDATIONS);
          setShowRecommendations(true);
          
          // 5 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopEntryDetection();
          }, 5000);
        }
        // Agar yuz tanilmagan bo'lsa (yangi mehmon)
        else {
          // Yuz atrofida qizil ramka chizish
          if (result.face_location) {
            const [top, right, bottom, left] = result.face_location;
            context.strokeStyle = '#FF3B30'; // Qizil - tanilmagan
            context.lineWidth = 2;
            context.strokeRect(left, top, right - left, bottom - top);
            
            // Xabar
            context.fillStyle = '#FF3B30';
            context.font = '16px Arial';
            context.fillText('Unregistered User', left, top - 10);
          }
          
          // Xabar ko'rsatish
          addToast('Unregistered visitor detected', 'info');
          
          // Default mashinalar tavsiyasini ko'rsatish
          setRecommendedCars(FALLBACK_RECOMMENDATIONS);
          setShowRecommendations(true);
          
          // 5 soniya kutib, deteksiyani to'xtatish
          setTimeout(() => {
            stopEntryDetection();
          }, 5000);
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

              {/* Mijoz ma'lumotlari bloki */}
              {entryDetectionResult && (
                <div className="mt-4">
                  {entryDetectionResult.is_recognized ? (
                    // Tanilgan mijoz uchun
                    <>
                      <div className="font-bold text-lg flex items-center">
                        <UserIcon className="h-5 w-5 mr-2 text-green-500" />
                        Client Information
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mt-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Name:</span> {entryDetectionResult.client_name}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Age:</span> {entryDetectionResult.client_data?.age || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Gender:</span> {entryDetectionResult.client_data?.gender || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Budget:</span> {entryDetectionResult.client_data?.budget 
                              ? `$${entryDetectionResult.client_data.budget.toLocaleString()}` 
                              : 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Purpose:</span> {entryDetectionResult.client_data?.purpose || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Credit:</span> {entryDetectionResult.client_data?.has_credit || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Tanilmagan mijoz uchun
                    <>
                      <div className="font-bold text-lg flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-500" />
                        Unregistered Visitor
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mt-2 text-sm border border-yellow-200 dark:border-yellow-800">
                        <p className="text-yellow-800 dark:text-yellow-200">
                          This visitor is not registered in the system. Would you like to register them?
                        </p>
                        <div className="mt-3">
                          <Button 
                            variant="secondary" 
                            onClick={() => navigate('/register')}
                            className="flex items-center"
                          >
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            Register New Client
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mashinalar tavsiyasi bloki */}
              {showRecommendations && (
                <div className="mt-4">
                  <div className="font-bold text-lg flex items-center">
                    <TruckIcon className="h-5 w-5 mr-2 text-blue-500" />
                    {entryDetectionResult?.is_recognized 
                      ? "Personalized Car Recommendations" 
                      : "Popular Car Models"}
                  </div>
                  
                  {loadingRecommendations ? (
                    <div className="flex justify-center p-4">
                      <Spinner size="md" />
                    </div>
                  ) : recommendedCars.length > 0 ? (
                    <div className="space-y-3 mt-2">
                      {recommendedCars.map(car => (
                        <div key={car.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-base">{car.brand} {car.model}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{car.category} • {car.year}</div>
                              
                              <div className="mt-2 flex items-center">
                                <CurrencyDollarIcon className="h-4 w-4 text-green-600 mr-1" />
                                <span className="text-sm font-medium">${car.price.toLocaleString()}</span>
                              </div>
                              
                              <div className="mt-1 flex items-center">
                                <TagIcon className="h-4 w-4 text-blue-600 mr-1" />
                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                  {entryDetectionResult?.is_recognized 
                                    ? `Match: ${Math.round(car.interest_score)}%` 
                                    : "Popular Model"}
                                </span>
                              </div>
                            </div>
                            
                            {car.image_url && (
                              <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                                <img src={car.image_url} alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                      No recommendations available
                    </div>
                  )}
                </div>
              )}
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