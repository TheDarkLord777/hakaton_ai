import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toaster';
import { getClients, deleteClient } from '../utils/api';

const UsersManagement = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');

  // Load clients
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
      addToast('Failed to load clients', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    if (searchField === 'all') {
      return (
        (client.first_name && client.first_name.toLowerCase().includes(term)) ||
        (client.last_name && client.last_name.toLowerCase().includes(term)) ||
        (client.phone && client.phone.toLowerCase().includes(term)) ||
        (client.workplace && client.workplace.toLowerCase().includes(term)) ||
        (client.age && String(client.age).includes(term)) ||
        (client.gender && client.gender.toLowerCase().includes(term))
      );
    }
    
    // Search in specific field
    if (searchField === 'name') {
      return (
        (client.first_name && client.first_name.toLowerCase().includes(term)) ||
        (client.last_name && client.last_name.toLowerCase().includes(term))
      );
    }
    
    if (searchField === 'phone' && client.phone) {
      return client.phone.toLowerCase().includes(term);
    }
    
    if (searchField === 'workplace' && client.workplace) {
      return client.workplace.toLowerCase().includes(term);
    }
    
    if (searchField === 'age' && client.age) {
      return String(client.age).includes(term);
    }
    
    if (searchField === 'gender' && client.gender) {
      return client.gender.toLowerCase().includes(term);
    }
    
    return false;
  });

  // Handle edit client
  const handleEditClient = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  // Handle delete client
  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(clientId);
        addToast('Client deleted successfully', 'success');
        loadClients(); // Reload clients
      } catch (err) {
        console.error('Error deleting client:', err);
        addToast('Failed to delete client', 'error');
      }
    }
  };

  console.log(clients);
  // Handle add new client
  const handleAddClient = () => {
    navigate('/register');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users Management</h1>
        <Button onClick={handleAddClient} className="flex items-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Add New User</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="phone">Phone</option>
                <option value="workplace">Workplace</option>
                <option value="age">Age</option>
                <option value="gender">Gender</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gender
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Age
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Workplace
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {client.name} {client.first_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {client.gender}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {client.age}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {client.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {client.workplace || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClient(client.id)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No users found. Please try a different search term.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManagement; 