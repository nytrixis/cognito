import React, { useEffect, useState, useRef } from 'react';
import './index.css';
import Chart from 'chart.js/auto';

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

  const totalEvents = events.length;
  const sessionIds = new Set(events.map(ev => ev.session_id));
  const totalSessions = sessionIds.size;
  const avgTimeOnPage = (() => {
    const times = events
      .filter(ev => ev.event_type === 'heartbeat' && ev.data && ev.data.timeOnPage)
      .map(ev => ev.data.timeOnPage);
    if (!times.length) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  })();
  const eventTypeCounts = events.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {});

  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chartInstance = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: Object.keys(eventTypeCounts),
        datasets: [{
          data: Object.values(eventTypeCounts),
          backgroundColor: [
            'rgba(34,211,238,0.7)', // cyan
            'rgba(45,212,191,0.7)', // teal
            'rgba(59,130,246,0.7)', // blue
            'rgba(244,63,94,0.7)',  // rose
            'rgba(251,191,36,0.7)', // yellow
            'rgba(203,213,225,0.7)' // gray
          ],
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.2)'
        }]
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: '#e0e7ef',
              font: { family: 'Montserrat, Times New Roman, Times, serif' }
            }
          }
        }
      }
    });
    return () => chartInstance.destroy();
  }, [events]);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md font-mont">
      <h1 className="text-4xl font-bold mb-4 mt-4 text-cyan-300 drop-shadow">Cognito Dashboard</h1>
      <p className="text-lg text-teal-200 mb-8">Your analytics dashboard is ready!</p>
      {loading ? (
        <div className="text-gray-400">Loading events...</div>
      ) : (
        <div className="w-full max-w-4xl">
          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-cyan-400/40 font-mont">
              <span className="text-2xl font-bold text-cyan-100 drop-shadow">{totalSessions}</span>
              <span className="text-cyan-200 text-sm mt-1">Total Sessions</span>
            </div>
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-teal-400/40 font-mont">
              <span className="text-2xl font-bold text-teal-100 drop-shadow">{totalEvents}</span>
              <span className="text-teal-200 text-sm mt-1">Total Events</span>
            </div>
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-blue-400/40 font-mont">
              <span className="text-2xl font-bold text-blue-100 drop-shadow">{avgTimeOnPage}s</span>
              <span className="text-blue-200 text-sm mt-1">Avg. Time on Page</span>
            </div>
          </div>
          <div className="w-full flex justify-center mb-8">
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700 flex flex-col items-center">
              <span className="text-lg font-semibold text-cyan-200 mb-2">Event Type Breakdown</span>
              <canvas ref={chartRef} width={220} height={220}></canvas>
            </div>
          </div>
          <table className="min-w-full bg-white/10 rounded-lg shadow overflow-hidden border border-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-cyan-300">ID</th>
                <th className="px-4 py-2 text-left text-teal-300">Type</th>
                <th className="px-4 py-2 text-left text-blue-300">Timestamp</th>
                <th className="px-4 py-2 text-left text-gray-200">Data</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.event_id} className="border-b border-gray-800 last:border-none hover:bg-white/5 transition">
                  <td className="px-4 py-2 text-gray-100">{ev.event_id}</td>
                  <td className="px-4 py-2 text-teal-200">{ev.event_type}</td>
                  <td className="px-4 py-2 text-blue-200">{ev.timestamp}</td>
                  <td className="px-4 py-2 text-xs break-all text-gray-300">{JSON.stringify(ev.data)}</td>
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