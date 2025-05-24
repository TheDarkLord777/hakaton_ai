import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { UserIcon, CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toaster';
import { createClient, getClient, updateClient, registerFace } from '../utils/api';
import Webcam from 'react-webcam';

const ClientRegister = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    age: '',
    phone: '',
    interests: '',
    budget: '',
    has_credit: '',
    workplace: '',
    purpose: ''
  });

  // Familiya o'zgarganda jinsni avtomatik aniqlash
  const handleLastNameChange = (e) => {
    const lastName = e.target.value;
    
    // Gender ni aniqlab o'rnatish
    if (lastName) {
      if (lastName.trim().toLowerCase().endsWith('a')) {
        setFormData(prev => ({ ...prev, last_name: lastName, gender: 'Female' }));
      } else {
        setFormData(prev => ({ ...prev, last_name: lastName, gender: 'Male' }));
      }
    } else {
      setFormData(prev => ({ ...prev, last_name: lastName }));
    }
  };

  // Existing client data loading
  useEffect(() => {
    if (clientId) {
      setIsLoading(true);
      getClient(clientId)
        .then(data => {
          // Telefon raqamidan +998 ni olib tashlash
          let phoneNumber = data.phone || '';
          if (phoneNumber.startsWith('+998')) {
            phoneNumber = phoneNumber.slice(4);
          }
          
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            gender: data.gender || '',
            age: data.age || '',
            phone: phoneNumber,
            interests: data.interests || '',
            budget: data.budget || '',
            has_credit: data.has_credit || '',
            workplace: data.workplace || '',
            purpose: data.purpose || ''
          });
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error loading client:', err);
          addToast('Error loading client data', 'error');
          setIsLoading(false);
        });
    }
  }, [clientId, addToast]);

  // Check if we have an image from face detection
  useEffect(() => {
    if (location.state?.fromDetection && location.state?.capturedImage) {
      setCapturedImage(location.state.capturedImage);
    }
  }, [location.state]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Telefon raqami uchun maxsus ishlov
    if (name === 'phone') {
      // Faqat raqamlarni qabul qilish
      const digitsOnly = value.replace(/\D/g, '');
      // Maksimal 9 ta raqam
      const truncated = digitsOnly.slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: truncated }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Form validation
      if (!formData.first_name || !formData.last_name || !formData.age) {
        addToast('Please fill in all required fields', 'error');
        setIsLoading(false);
      return;
    }
    
      // Telefon raqamiga +998 qo'shish
      const fullPhone = formData.phone ? `+998${formData.phone}` : '';

      let clientData = {
        ...formData,
        age: parseInt(formData.age),
        phone: fullPhone,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };

      let response;
      try {
        if (clientId) {
          // Update existing client
          response = await updateClient(clientId, clientData);
          addToast('Client updated successfully', 'success');
        } else {
          // Create new client
          response = await createClient(clientData);
          addToast('Client registered successfully', 'success');
          
          // If we have a captured image, register the face
          if (capturedImage) {
    try {
      // Convert base64 to blob
      const byteString = atob(capturedImage.split(',')[1]);
      const mimeString = capturedImage.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      
      // Register face
              await registerFace(response.id, blob);
              addToast('Face registered successfully', 'success');
            } catch (err) {
              console.error('Error registering face:', err);
              addToast('Error registering face', 'error');
            }
          }
        }

        // Navigate back or to client details
      navigate('/');
      } catch (err) {
        if (err.response && err.response.status === 400 && err.response.data.detail === "Phone number already registered") {
          addToast('Phone number already registered with another client', 'error');
        } else {
          throw err; // Re-throw other errors to be caught by the outer catch
        }
      }
    } catch (err) {
      console.error('Error saving client:', err);
      addToast('Error saving client data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const activateCamera = () => {
    setIsCameraActive(true);
    setCapturedImage(null);
  };

  const captureImage = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      setCapturedImage(screenshot);
      setIsCameraActive(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {clientId ? 'Edit Client' : 'Register New Client'}
        </h1>
      </div>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Form */}
        <div className="lg:col-span-2">
      <Card>
        <CardHeader>
              <CardTitle>Client Information</CardTitle>
        </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name*
                  </label>
                  <input
                    type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                    onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name*
                  </label>
                  <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleLastNameChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                  />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gender*
                  </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                    onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      Auto-detected from last name (ends with 'a' = Female)
                    </p>
                </div>
                <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Age*
                  </label>
                  <input
                    type="number"
                      id="age"
                    name="age"
                      min="0"
                      max="120"
                    value={formData.age}
                    onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      required
                  />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone (+998)
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="901234567"
                    />
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      Enter 9 digits without +998
                    </p>
                  </div>
                <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Budget
                  </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        id="budget"
                        name="budget"
                        min="0"
                        value={formData.budget}
                    onChange={handleInputChange}
                        className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="has_credit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Has Credit
                  </label>
                  <select
                      id="has_credit"
                      name="has_credit"
                      value={formData.has_credit}
                    onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="">Select Option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                  </select>
                </div>
                <div>
                    <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Visit Purpose
                  </label>
                  <select
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Select Purpose</option>
                    <option value="View new cars">View new cars</option>
                    <option value="Access services">Access services</option>
                    <option value="Schedule test drive">Schedule test drive</option>
                    <option value="Manage documents">Manage documents</option>
                    <option value="Get information">Get information</option>
                    <option value="Purchase car">Purchase car</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="workplace" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Workplace
                  </label>
                  <input
                    type="text"
                      id="workplace"
                      name="workplace"
                      value={formData.workplace}
                    onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="Company or organization"
                  />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="interests" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Interests
                  </label>
                  <textarea
                    id="interests"
                    name="interests"
                    rows="3"
                    value={formData.interests}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Car preferences, features, etc."
                  ></textarea>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : clientId ? (
                    'Update Client'
                  ) : (
                    'Register Client'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Face Registration - Soddalashtirilgan */}
        <Card>
          <CardHeader>
            <CardTitle>Face Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCameraActive ? (
            <div className="space-y-4">
                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="w-full rounded-lg shadow-md"
                  />
                  
                  {/* Yuz joylashuvi uchun yo'riqnoma */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-3/4 border-4 border-dashed border-yellow-500 rounded-full opacity-50"></div>
                  </div>
                    </div>
                
                <div className="p-2 text-sm rounded-md bg-yellow-100 text-yellow-800 font-medium text-center">
                  Yuzingizni doira ichiga joylashtiring
                </div>
                
                <Button 
                  onClick={captureImage} 
                  className="w-full"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture Photo
                </Button>
              </div>
            ) : capturedImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
                <Button variant="outline" onClick={activateCamera} className="w-full">
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Retake Photo
                </Button>
            </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No face image captured</p>
                <Button onClick={activateCamera}>
                    <CameraIcon className="w-5 h-5 mr-2" />
                  Activate Camera
                  </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-gray-500 dark:text-gray-400">
            <div className="space-y-2">
              <p>Face image is used for automatic recognition when the client visits again.</p>
              <ul className="list-disc list-inside text-xs">
                <li>Yuzingizni doira ichiga joylashtiring</li>
                <li>Yaxshi yorug'lik bo'lishi kerak</li>
                <li>Ko'zoynak va bosh kiyimlarni yechish tavsiya etiladi</li>
                <li>To'g'ridan qarang, yuzingizni burmasdan</li>
              </ul>
            </div>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
};

export default ClientRegister; 