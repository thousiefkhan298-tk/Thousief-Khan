import React from 'react';
import Layout from '../components/Layout';
import TrainerDashboard from './Dashboard/TrainerDashboard';
import ClientDashboard from './Dashboard/ClientDashboard';

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const userData = user;

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
