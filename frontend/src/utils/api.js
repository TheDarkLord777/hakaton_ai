import axios from 'axios';

// Proxy ishlamayotgan bo'lsa to'g'ridan-to'g'ri manzildan foydalanish
const API_URL = '/api';  // package.json'da proxy sozlamasi bo'lgani uchun nisbiy yo'ldan foydalanish

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Clients
export const getClients = async () => {
  try {
    const response = await api.get('/clients');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClient = async (id) => {
  try {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createClient = async (clientData) => {
  try {
    const response = await api.post('/clients', clientData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateClient = async (id, clientData) => {
  try {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
};

// Visits
export const getVisits = async () => {
  const response = await api.get('/visits');
  return response.data;
};

export const getCurrentVisits = async () => {
  const response = await api.get('/visits/current');
  return response.data;
};

export const getClientVisits = async (clientId) => {
  const response = await api.get(`/visits/client/${clientId}`);
  return response.data;
};

export const createVisit = async (visitData) => {
  const response = await api.post('/visits', visitData);
  return response.data;
};

export const checkoutVisit = async (visitId) => {
  const response = await api.put(`/visits/${visitId}/checkout`);
  return response.data;
};

// Cars
export const getCars = async () => {
  const response = await api.get('/cars');
  return response.data;
};

export const getCar = async (id) => {
  const response = await api.get(`/cars/${id}`);
  return response.data;
};

export const createCar = async (carData) => {
  const response = await api.post('/cars', carData);
  return response.data;
};

export const updateCar = async (id, carData) => {
  const response = await api.put(`/cars/${id}`, carData);
  return response.data;
};

export const deleteCar = async (id) => {
  const response = await api.delete(`/cars/${id}`);
  return response.data;
};

// Face Recognition
export const detectFace = async (imageData) => {
  const formData = new FormData();
  formData.append('file', imageData);
  
  const response = await api.post('/face/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const detectMultipleFaces = async (imageData) => {
  const formData = new FormData();
  formData.append('file', imageData);
  
  const response = await api.post('/face/detect-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const registerFace = async (clientId, imageData) => {
  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('file', imageData);
  
  const response = await api.post('/face/register-face', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getRecommendations = async (clientId) => {
  const response = await api.post(`/face/recommendations/${clientId}`);
  return response.data;
};

// Analytics
export const getVisitCount = async (days = 30) => {
  const response = await api.get(`/analytics/visits/count?days=${days}`);
  return response.data;
};

export const getVisitsByGender = async (days = 30) => {
  const response = await api.get(`/analytics/visits/by-gender?days=${days}`);
  return response.data;
};

export const getVisitsByAge = async (days = 30) => {
  const response = await api.get(`/analytics/visits/by-age?days=${days}`);
  return response.data;
};

export const getMostRecommendedCars = async (days = 30, limit = 5) => {
  const response = await api.get(`/analytics/cars/most-recommended?days=${days}&limit=${limit}`);
  return response.data;
};

export const getClientStats = async () => {
  const response = await api.get('/analytics/clients/stats');
  return response.data;
}; 