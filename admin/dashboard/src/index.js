import React, { useEffect, useState } from 'react';
import './index.css';

const App = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/wordpress/wp-json/cognito/v1/events', {
      headers: {
        'X-WP-Nonce': window.cognitoDashboard.nonce
      }
    })
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white/60 to-blue-100/60 backdrop-blur-md rounded-xl shadow-lg p-10">
      <h1 className="text-4xl font-bold mb-4 text-blue-900 drop-shadow">Cognito Dashboard</h1>
      <p className="text-lg text-gray-700 mb-8">Your analytics dashboard is ready!</p>
      {loading ? (
        <div className="text-gray-500">Loading events...</div>
      ) : (
        <div className="w-full max-w-4xl">
          <table className="min-w-full bg-white/70 rounded-lg shadow overflow-hidden">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Timestamp</th>
                <th className="px-4 py-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.event_id} className="border-b last:border-none">
                  <td className="px-4 py-2">{ev.event_id}</td>
                  <td className="px-4 py-2">{ev.event_type}</td>
                  <td className="px-4 py-2">{ev.timestamp}</td>
                  <td className="px-4 py-2 text-xs break-all">{JSON.stringify(ev.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('cognito-dashboard-root'));
root.render(<App />);