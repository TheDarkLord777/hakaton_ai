import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useToast } from '../components/ui/Toaster';
import { getVisitCount, getVisitsByGender, getVisitsByAge, getMostRecommendedCars, getClientStats } from '../utils/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

const Analytics = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [visitCount, setVisitCount] = useState(0);
  const [genderStats, setGenderStats] = useState([]);
  const [ageStats, setAgeStats] = useState([]);
  const [recommendedCars, setRecommendedCars] = useState([]);
  const [clientStats, setClientStats] = useState({});
  const [monthlyVisits, setMonthlyVisits] = useState({});

  // Chart colors
  const chartColors = {
    primary: 'rgba(99, 102, 241, 1)',
    primaryLight: 'rgba(99, 102, 241, 0.2)',
    secondary: 'rgba(249, 115, 22, 1)',
    secondaryLight: 'rgba(249, 115, 22, 0.2)',
    success: 'rgba(16, 185, 129, 1)',
    successLight: 'rgba(16, 185, 129, 0.2)',
    warning: 'rgba(245, 158, 11, 1)',
    warningLight: 'rgba(245, 158, 11, 0.2)',
    danger: 'rgba(239, 68, 68, 1)',
    dangerLight: 'rgba(239, 68, 68, 0.2)',
    info: 'rgba(6, 182, 212, 1)',
    infoLight: 'rgba(6, 182, 212, 0.2)',
    purple: 'rgba(139, 92, 246, 1)',
    purpleLight: 'rgba(139, 92, 246, 0.2)',
    pink: 'rgba(236, 72, 153, 1)',
    pinkLight: 'rgba(236, 72, 153, 0.2)',
  };
  
  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [visitCountData, genderData, ageData, carsData, clientStatsData] = await Promise.all([
        getVisitCount().catch(err => ({ count: 0 })),
        getVisitsByGender().catch(err => ([])),
        getVisitsByAge().catch(err => ([])),
        getMostRecommendedCars().catch(err => ([])),
        getClientStats().catch(err => ({}))
      ]);
      
      setVisitCount(visitCountData?.count || 0);
      
      // Ensure genderData is array
      if (genderData && Array.isArray(genderData)) {
        setGenderStats(genderData);
      } else if (genderData && typeof genderData === 'object') {
        // Convert object to array if needed
        const genderArray = Object.keys(genderData).map(key => ({
          gender: key,
          count: genderData[key]
        }));
        setGenderStats(genderArray);
      } else {
        // Default data if API returns unexpected format
        setGenderStats([
          { gender: 'Male', count: 65 },
          { gender: 'Female', count: 35 }
        ]);
      }
      
      // Ensure ageData is array
      if (ageData && Array.isArray(ageData)) {
        setAgeStats(ageData);
      } else {
        // Default data if API returns unexpected format
        setAgeStats([
          { age_group: '18-24', count: 15 },
          { age_group: '25-34', count: 30 },
          { age_group: '35-44', count: 25 },
          { age_group: '45-54', count: 20 },
          { age_group: '55+', count: 10 }
        ]);
      }
      
      // Ensure carsData is array
      if (carsData && Array.isArray(carsData)) {
        setRecommendedCars(carsData.slice(0, 5)); // Top 5 cars
      } else {
        // Default data if API returns unexpected format
        setRecommendedCars([
          { brand: 'Toyota', model: 'Camry', recommendation_count: 25 },
          { brand: 'Honda', model: 'Accord', recommendation_count: 20 },
          { brand: 'Tesla', model: 'Model 3', recommendation_count: 18 },
          { brand: 'BMW', model: '3 Series', recommendation_count: 15 },
          { brand: 'Audi', model: 'A4', recommendation_count: 12 }
        ]);
      }
      
      setClientStats(clientStatsData || { total_clients: 0, new_clients: 0, average_age: 0 });
      
      // Generate sample monthly data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const lastSixMonths = months.slice(currentMonth - 5 >= 0 ? currentMonth - 5 : (currentMonth - 5 + 12), currentMonth + 1);
      
      // Generate random data for demonstration
      const maleData = lastSixMonths.map(() => Math.floor(Math.random() * 50) + 10);
      const femaleData = lastSixMonths.map(() => Math.floor(Math.random() * 50) + 10);
      
      setMonthlyVisits({
        labels: lastSixMonths,
          datasets: [
            {
            label: 'Male',
            data: maleData,
            backgroundColor: chartColors.primaryLight,
            borderColor: chartColors.primary,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Female',
            data: femaleData,
            backgroundColor: chartColors.secondaryLight,
            borderColor: chartColors.secondary,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            }
          ]
        });
    } catch (err) {
      console.error('Error loading analytics:', err);
      addToast('Failed to load analytics data', 'error');
      
      // Set default data in case of error
      setGenderStats([
        { gender: 'Male', count: 65 },
        { gender: 'Female', count: 35 }
      ]);
      
      setAgeStats([
        { age_group: '18-24', count: 15 },
        { age_group: '25-34', count: 30 },
        { age_group: '35-44', count: 25 },
        { age_group: '45-54', count: 20 },
        { age_group: '55+', count: 10 }
      ]);
      
      setRecommendedCars([
        { brand: 'Toyota', model: 'Camry', recommendation_count: 25 },
        { brand: 'Honda', model: 'Accord', recommendation_count: 20 },
        { brand: 'Tesla', model: 'Model 3', recommendation_count: 18 },
        { brand: 'BMW', model: '3 Series', recommendation_count: 15 },
        { brand: 'Audi', model: 'A4', recommendation_count: 12 }
      ]);
      
      setClientStats({ total_clients: 120, new_clients: 15, average_age: 35.5 });
      } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const genderChartData = {
    labels: genderStats.map(item => item.gender),
    datasets: [
      {
        label: 'Gender Distribution',
        data: genderStats.map(item => item.count),
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
        ],
        borderColor: [
          chartColors.primary,
          chartColors.secondary,
        ],
        borderWidth: 1,
      },
    ],
  };

  const ageChartData = {
    labels: ageStats.map(item => item.age_group),
    datasets: [
      {
        label: 'Visitors',
        data: ageStats.map(item => item.count),
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.success,
        borderWidth: 2,
      },
    ],
  };

  const carsChartData = {
    labels: recommendedCars.map(car => `${car.brand} ${car.model}`),
    datasets: [
      {
        label: 'Recommendations',
        data: recommendedCars.map(car => car.recommendation_count),
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.warning,
          chartColors.info,
        ],
        borderColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.warning,
          chartColors.info,
        ],
        borderWidth: 1,
      },
    ],
  };

  const interestChartData = {
    labels: ['Luxury', 'Sports', 'SUV', 'Sedan', 'Electric', 'Hybrid'],
    datasets: [
      {
        label: 'Client Interests',
        data: [65, 59, 90, 81, 56, 55],
        fill: true,
        backgroundColor: chartColors.infoLight,
        borderColor: chartColors.info,
        pointBackgroundColor: chartColors.info,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: chartColors.info
      }
    ]
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{visitCount}</div>
                <p className="text-xs text-blue-100 mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{clientStats.total_clients || 0}</div>
                <p className="text-xs text-green-100 mt-1">Registered in system</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">New Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{clientStats.new_clients || 0}</div>
                <p className="text-xs text-orange-100 mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Average Age</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {clientStats.average_age ? clientStats.average_age.toFixed(1) : 'N/A'}
        </div>
                <p className="text-xs text-purple-100 mt-1">Of all clients</p>
              </CardContent>
            </Card>
      </div>
      
          {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Visits */}
        <Card>
          <CardHeader>
                <CardTitle>Monthly Visits</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-80">
                  {monthlyVisits.labels && (
                    <Line 
                      data={monthlyVisits}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          }
                        },
                  scales: {
                    y: {
                            beginAtZero: true
                    }
                  }
                }}
                    />
                  )}
            </div>
          </CardContent>
        </Card>
        
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-80 flex items-center justify-center">
                  {genderStats.length > 0 && (
                    <Doughnut 
                      data={genderChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                            position: 'top',
                    }
                  }
                }}
                    />
                  )}
            </div>
          </CardContent>
        </Card>
          </div>
        
          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-80">
                  {ageStats.length > 0 && (
                    <Bar 
                      data={ageChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          }
                        },
                  scales: {
                    y: {
                            beginAtZero: true
                    }
                  }
                }}
                    />
                  )}
            </div>
          </CardContent>
        </Card>

            {/* Interest Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Client Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <Radar 
                    data={interestChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      elements: {
                        line: {
                          borderWidth: 3
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        
        {/* Most Recommended Cars */}
        <Card>
          <CardHeader>
            <CardTitle>Most Recommended Cars</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="h-80">
                {recommendedCars.length > 0 && (
                  <Doughnut 
                    data={carsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        }
                      }
                    }}
                  />
                )}
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
};

export default Analytics; 