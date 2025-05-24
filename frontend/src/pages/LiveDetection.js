import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { CameraIcon, UserPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toaster';
import { detectFace, getRecommendations } from '../utils/api';

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
                if (response.is_recognized) {
                  if (lastDetectedClientId !== response.client_id) {
                    setLastDetectedClientId(response.client_id);
                    setLastDetectedVisitorLocation(null);
                    setDetectedClient(response);
                    setDetectedFaces([response]);
                    setRecognizedClients([response]);
                    
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
                    setDetectedFaces([response]);
                    setRecognizedClients([]);
                    setDetectedClient(null);
                    setRecommendations([]);
                    
                    addToast('New visitor detected!', 'info');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Face Detection</h1>
        <div className="flex space-x-2">
          {isCapturing ? (
            <Button 
              variant="outline" 
              onClick={stopCapturing}
              className="flex items-center space-x-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Stop Scanning</span>
            </Button>
          ) : (
            <Button 
              onClick={restartCapturing}
              disabled={!isCameraReady || cameraError}
              className="flex items-center space-x-2"
            >
              <CameraIcon className="w-5 h-5" />
              <span>Start New Scan</span>
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={handleRegisterNew}
            className="flex items-center space-x-2"
          >
            <UserPlusIcon className="w-5 h-5" />
            <span>Register New</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-red-500 mb-4">{cameraError}</p>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="w-full rounded-lg shadow-md"
                    onUserMedia={handleCameraReady}
                    onUserMediaError={handleCameraError}
                  />
                  {isCapturing && (
                    <div className="absolute top-4 right-4 flex items-center bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm font-medium">Scanning...</span>
                    </div>
                  )}
                  
                  {detectedFaces.map((face, index) => (
                    <div
                      key={`face-${index}`}
                      className={`absolute border-4 ${face.is_recognized ? 'border-green-500' : 'border-yellow-500'}`}
                      style={{
                        top: `${face.face_location[0]}px`,
                        right: `${face.face_location[1]}px`,
                        bottom: `${face.face_location[2]}px`,
                        left: `${face.face_location[3]}px`
                      }}
                    >
                      <div 
                        className={`absolute -top-7 left-0 ${face.is_recognized ? 'bg-green-500' : 'bg-yellow-500'} text-white px-2 py-1 text-xs font-bold rounded-t-md`}
                      >
                        {face.is_recognized ? `Client #${face.client_id}` : `New Visitor #${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {!cameraError && (
              <CardFooter className="bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                {isCameraReady ? (
                  <div className="flex justify-between w-full items-center">
                    <p>Camera is ready. Click "Start New Scan" to detect new faces.</p>
                    {!isCapturing && detectedFaces.length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={restartCapturing}
                      >
                        Scan Again
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    <p>Initializing camera...</p>
                  </div>
                )}
              </CardFooter>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recognition Results</CardTitle>
          </CardHeader>
          <CardContent>
            {detectedFaces.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Detected Faces: {detectedFaces.length}
                  </h3>
                  <div className="space-y-2">
                    {recognizedClients.length > 0 && (
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        Registered Clients: {recognizedClients.length}
                      </div>
                    )}
                    {detectedFaces.filter(face => !face.is_recognized).length > 0 && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        New Visitors: {detectedFaces.filter(face => !face.is_recognized).length}
                      </div>
                    )}
                  </div>
                </div>

                {recognizedClients.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Recognized Clients
                    </h4>
                    <ul className="space-y-2">
                      {recognizedClients.map((client, index) => (
                        <li key={`client-${index}`} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 p-1 rounded-full bg-green-100 dark:bg-green-800">
                              <UserPlusIcon className="w-4 h-4 text-green-600 dark:text-green-300" />
                            </div>
                            <div className="ml-3">
                              <h5 className="text-sm font-medium text-green-800 dark:text-green-300">
                                Client #{client.client_id}
                              </h5>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                Confidence: {client.confidence.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detectedFaces.filter(face => !face.is_recognized).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Unregistered Visitors
                    </h4>
                    <ul className="space-y-2">
                      {detectedFaces
                        .filter(face => !face.is_recognized)
                        .map((face, index) => (
                          <li key={`visitor-${index}`} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 p-1 rounded-full bg-yellow-100 dark:bg-yellow-800">
                                  <UserPlusIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-300" />
                                </div>
                                <div className="ml-3">
                                  <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                    New Visitor #{index + 1}
                                  </h5>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleRegisterSpecificFace(index, face)}
                              >
                                Register
                              </Button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {detectedClient && recommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Recommendations for Client #{detectedClient.client_id}
                    </h4>
                    {loadingRecommendations ? (
                      <div className="flex justify-center py-4">
                        <Spinner />
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {recommendations.slice(0, 3).map((car, index) => (
                          <li key={car.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {car.brand} {car.model}
                                </h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {car.category} · ${car.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs font-semibold px-2 py-1 rounded-full">
                                {car.interest_score.toFixed(0)}%
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No faces detected</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Start scanning to detect visitors
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Client"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Would you like to register a new client? This will take you to the registration form.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </Button>
            <Button onClick={goToRegistration}>
              Go to Registration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LiveDetection; 