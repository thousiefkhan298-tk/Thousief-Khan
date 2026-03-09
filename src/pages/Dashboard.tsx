import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import TrainerDashboard from './Dashboard/TrainerDashboard';
import ClientDashboard from './Dashboard/ClientDashboard';

const Dashboard: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await api.getMe();
        if (data) {
          setUserData(data);
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout userData={userData}>
      {userData?.role === 'TRAINER' ? (
        <TrainerDashboard userData={userData} />
      ) : (
        <ClientDashboard userData={userData} />
      )}
    </Layout>
  );
};

export default Dashboard;
