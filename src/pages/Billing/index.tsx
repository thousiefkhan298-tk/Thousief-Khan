import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';

const Billing: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch all payments
        const payments = await firebaseService.getAllPayments();
        setAllPayments(payments);
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
        <h1 className="text-2xl font-bold text-white mb-6">Trainer Billing Overview</h1>
        <div className="bg-[#141417] p-6 rounded-2xl border border-[#1e1e24]">
          <table className="w-full text-left text-white font-mono text-xs">
            <thead>
              <tr className="text-neutral-500 uppercase tracking-widest">
                <th className="p-4">Client ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-[#1e1e24]">
                  <td className="p-4">{payment.clientId}</td>
                  <td className="p-4">₹{payment.amount}</td>
                  <td className="p-4">{payment.status}</td>
                  <td className="p-4">{payment.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Billing;
