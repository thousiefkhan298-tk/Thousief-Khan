import React from 'react';
import Layout from '../components/Layout';
import TrainerDashboard from './Dashboard/TrainerDashboard';
import ClientDashboard from './Dashboard/ClientDashboard';
import { TRAINER_EMAILS } from '../constants';

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const userData = user;
  const isTrainer = userData?.role === 'TRAINER' || (userData?.email && TRAINER_EMAILS.some(e => e.toLowerCase() === userData.email.toLowerCase()));

  return (
    <Layout userData={userData}>
      {isTrainer ? (
        <TrainerDashboard userData={userData} />
      ) : (
        <ClientDashboard userData={userData} />
      )}
    </Layout>
  );
};

export default Dashboard;
