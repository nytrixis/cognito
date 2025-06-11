import React, { useEffect, useState, useRef } from 'react';
import './index.css';
import Chart from 'chart.js/auto';

const App = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });


  useEffect(() => {
    fetch('/wordpress/wp-json/cognito/v1/filteredEvents', {
      headers: {
        'X-WP-Nonce': window.cognitoDashboard.nonce
      }
    })
      .then(res => res.json())
      .then(data => {
      setEvents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const chartRef = useRef(null);
  const filteredEvents = events.filter(ev => {
    if (selectedEventType && ev.event_type !== selectedEventType) return false;
    if (selectedPost && (ev.post_title || ev.post_id) !== selectedPost) return false;
    if (dateRange.from && new Date(ev.timestamp) < new Date(dateRange.from)) return false;
    if (dateRange.to && new Date(ev.timestamp) > new Date(dateRange.to)) return false;
    return true;
  });

  const totalfilteredEvents = filteredEvents.length;
  const sessionIds = new Set(filteredEvents.map(ev => ev.session_id));
  const totalSessions = sessionIds.size;
  const avgTimeOnPage = (() => {
    const times = filteredEvents
      .filter(ev => ev.event_type === 'heartbeat' && ev.data && ev.data.timeOnPage)
      .map(ev => ev.data.timeOnPage);
    if (!times.length) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  })();
  const eventTypeCounts = filteredEvents.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {});

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
  }, [filteredEvents]);

  const filteredEventsByHour = {};
  filteredEvents.forEach(ev => {
    if (!ev.timestamp) return;
    const localDate = new Date(ev.timestamp.replace(' ', 'T') + 'Z');
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hour = String(localDate.getHours()).padStart(2, '0');
    const hourLabel = `${year}-${month}-${day} ${hour}:00`;
    filteredEventsByHour[hourLabel] = (filteredEventsByHour[hourLabel] || 0) + 1;
  });

  const lineLabels = Object.keys(filteredEventsByHour).sort();
  const lineData = lineLabels.map(label => filteredEventsByHour[label]);
  const lineChartRef = useRef(null);

  const postEngagement = {};
  filteredEvents.forEach(ev => {
    const post = ev.post_title || ev.post_id || 'Unknown';
    postEngagement[post] = (postEngagement[post] || 0) + 1;
  });
  const topPosts = Object.entries(postEngagement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  useEffect(() => {
    if (!lineChartRef.current) return;
    const chartInstance = new Chart(lineChartRef.current, {
      type: 'line',
      data: {
        labels: lineLabels,
        datasets: [{
          label: 'Events per Hour',
          data: lineData,
          borderColor: 'rgba(34,211,238,0.9)',
          backgroundColor: 'rgba(34,211,238,0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: 'rgba(59,130,246,0.8)'
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
        },
        scales: {
          x: { ticks: { color: '#e0e7ef' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#e0e7ef' }, grid: { color: '#334155' } }
        }
      }
    });
    return () => chartInstance.destroy();
  }, [filteredEvents]);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md font-mont">     
      <h1 className="text-4xl font-bold mb-4 mt-4 text-cyan-300 drop-shadow">Cognito Dashboard</h1>
      <p className="text-lg text-teal-200 mb-8">Your analytics dashboard is ready!</p>
      {loading ? (
        <div className="text-gray-400">Loading Events...</div>
      ) : (
        <div className="w-full max-w-4xl">
          <div className="w-full flex justify-center mb-8">
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700 flex flex-wrap gap-4 items-center justify-center w-full max-w-4xl">
              {/* Event Type Filter */}
              <select
                className="bg-gray-800 text-cyan-200 rounded px-3 py-2 focus:ring-2 focus:ring-cyan-400 transition"
                value={selectedEventType}
                onChange={e => setSelectedEventType(e.target.value)}
              >
                <option value="">All Event Types</option>
                {Object.keys(eventTypeCounts).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {/* Post Filter */}
              <select
                className="bg-gray-800 text-cyan-200 rounded px-3 py-2 focus:ring-2 focus:ring-cyan-400 transition"
                value={selectedPost}
                onChange={e => setSelectedPost(e.target.value)}
              >
                <option value="">All Posts</option>
                {Array.from(new Set(events.map(ev => ev.post_title || ev.post_id || 'Unknown'))).map(post => (
                  <option key={post} value={post}>{post}</option>
                ))}
              </select>
              {/* Date Range Filter */}
              <input
                type="date"
                className="bg-gray-800 text-cyan-200 rounded px-3 py-2 focus:ring-2 focus:ring-cyan-400 transition"
                value={dateRange.from}
                onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
              />
              <input
                type="date"
                className="bg-gray-800 text-cyan-200 rounded px-3 py-2 focus:ring-2 focus:ring-cyan-400 transition"
                value={dateRange.to}
                onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-cyan-400/40 font-mont">
              <span className="text-2xl font-bold text-cyan-100 drop-shadow">{totalSessions}</span>
              <span className="text-cyan-200 text-sm mt-1">Total Sessions</span>
            </div>
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-teal-400/40 font-mont">
              <span className="text-2xl font-bold text-teal-100 drop-shadow">{totalfilteredEvents}</span>
              <span className="text-teal-200 text-sm mt-1">Total Events</span>
            </div>
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-blue-400/40 font-mont">
              <span className="text-2xl font-bold text-blue-100 drop-shadow">{avgTimeOnPage}s</span>
              <span className="text-blue-200 text-sm mt-1">Avg. Time on Page</span>
            </div>
          </div>
          <div className="w-full flex flex-col lg:flex-row justify-center gap-8 mb-8 items-stretch">
            {/* Doughnut Chart */}
            <div className="flex-1 bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700 flex flex-col items-center h-full">
              <span className="text-lg font-semibold text-cyan-200 mb-2">Event Type Breakdown</span>
              <canvas ref={chartRef} width={220} height={220}></canvas>
            </div>
            {/* Line Chart */}
            <div className="flex-1 bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700 flex flex-col items-center h-full">
              <span className="text-lg font-semibold text-cyan-200 mb-2">Engagement Over Time</span>
              <canvas ref={lineChartRef} width={400} height={220}></canvas>
            </div>
            {/* Most Engaged Posts */}
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700 mb-8 flex-1 min-w-[250px] flex flex-col items-center h-full">
              <span className="text-lg font-semibold text-cyan-200 mb-2 block">Most Engaged Posts</span>
              <ul className="flex-1 flex flex-col justify-center w-full">
                {topPosts.map(([post, count]) => (
                  <li key={post} className="text-gray-200">
                    <span className="font-bold text-cyan-300">{post}</span>: {count} filteredEvents
                  </li>
                ))}
              </ul>
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
              {filteredEvents.map(ev => (
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