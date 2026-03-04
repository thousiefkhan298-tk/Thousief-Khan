
import React, { useState } from 'react';
import { User, PaymentRecord } from '../../../types';
import { store } from '../../../store';

const PaymentManager: React.FC<{ clients: User[] }> = ({ clients = [] }) => {
  const [activeClient, setActiveClient] = useState<string>('');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Helper to get date 30 days from now
  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [newPayment, setNewPayment] = useState({
    package: 'Monthly Silver',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: getDefaultDueDate(),
    status: 'Paid' as any
  });

  React.useEffect(() => {
    if (activeClient) {
      const fetchData = async () => {
        setLoading(true);
        const data = await store.getClientData(activeClient);
        setSelectedData(data);
        setLoading(false);
      };
      fetchData();
    } else {
      setSelectedData(null);
    }
  }, [activeClient]);

  const handleSave = async () => {
    if (activeClient) {
      if (!newPayment.dueDate) {
        alert('Please select a due date.');
        return;
      }
      const record: PaymentRecord = {
        id: Date.now().toString(),
        clientId: activeClient,
        ...newPayment
      };
      await store.savePayment(record);
      alert('Payment record updated.');
      
      // Refresh data
      const data = await store.getClientData(activeClient);
      setSelectedData(data);

      // Reset due date for next entry
      setNewPayment({...newPayment, dueDate: getDefaultDueDate()});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest px-4">Billing Status</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClient(c.id)}
              className={`w-full p-4 rounded-2xl text-left border transition-all ${activeClient === c.id ? 'bg-lime-500 border-lime-500 text-black font-bold' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
            >
              <div className="text-sm font-bold truncate">{c.name || c.email}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-8">
        {activeClient ? (
          <>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Add New Payment Entry</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Package Plan</label>
                  <select 
                    value={newPayment.package} 
                    onChange={e => setNewPayment({...newPayment, package: e.target.value})}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
                  >
                    <option>Monthly Silver</option>
                    <option>Monthly Gold</option>
                    <option>Quarterly Platinum</option>
                    <option>Annual Elite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Status</label>
                  <select 
                    value={newPayment.status} 
                    onChange={e => setNewPayment({...newPayment, status: e.target.value as any})}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Due Date</label>
                  <input 
                    type="date" 
                    value={newPayment.dueDate}
                    onChange={e => setNewPayment({...newPayment, dueDate: e.target.value})}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={handleSave} className="w-full py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400">Save Record</button>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
               <h3 className="text-xl font-bold mb-6">Billing History</h3>
               <div className="space-y-4">
                  {(selectedData?.payments || []).length ? (selectedData.payments || []).slice().reverse().map((pay: PaymentRecord) => (
                    <div key={pay.id} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
                            <i className="fas fa-receipt text-neutral-400"></i>
                         </div>
                         <div>
                            <p className="text-sm font-bold">{pay.package}</p>
                            <p className="text-xs text-neutral-500">Due: {pay.dueDate}</p>
                         </div>
                       </div>
                       <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${
                         pay.status === 'Paid' ? 'bg-lime-500/10 text-lime-500' : 
                         pay.status === 'Overdue' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                       }`}>
                         {pay.status}
                       </span>
                    </div>
                  )) : (
                    <p className="text-neutral-500 text-sm text-center py-10">No payment history.</p>
                  )}
               </div>
            </div>
          </>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-neutral-600 border border-dashed border-neutral-800 rounded-3xl">
            <i className="fas fa-money-check-alt text-4xl mb-4"></i>
            <p className="font-bold uppercase tracking-widest text-sm">Select a client for billing management</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
