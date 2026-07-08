import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';

const Subscription: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch subscription
        const sub = await firebaseService.getClientSubscription(currentUser.uid);
        setSubscription(sub);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Layout userData={user}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Manage Subscription</h1>
        <div className="bg-[#141417] p-6 rounded-2xl border border-[#1e1e24] text-white">
          {subscription ? (
            <div>
              <p>Plan: {subscription.planName}</p>
              <p>Status: {subscription.status}</p>
              <p>Next Due: {subscription.nextDueDate}</p>
            </div>
          ) : (
            <p>No active subscription found.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Subscription;
