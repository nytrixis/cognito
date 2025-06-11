import React, { useEffect, useState, useRef } from 'react';
import './index.css';
import Chart from 'chart.js/auto';
import h337 from 'heatmap.js';

const App = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [heatmapData, setHeatmapData] = useState([]);
  const heatmapContainerRef = useRef(null);

  const points = heatmapData
    .filter(ev => ev.data && typeof ev.data.x === 'number' && typeof ev.data.y === 'number')
    .map(ev => ({
      x: ev.data.x,
      y: ev.data.y,
      value: 1
    }));


  useEffect(() => {
  let url = '/wordpress/wp-json/cognito/v1/filteredEvents';
  if (selectedPost) {
    url += `?post_id=${selectedPost}`;
  }
  fetch(url, {
    headers: {
      'X-WP-Nonce': window.cognitoDashboard.nonce
    }
  })
    .then(res => res.json())
    .then(data => {
      setEvents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
}, [selectedPost]);

  useEffect(() => {
    if (!selectedPost) return;
    fetch(`/wordpress/wp-json/cognito/v1/heatmap?post_id=${selectedPost}`)
      .then(res => res.json())
      .then(data => setHeatmapData(Array.isArray(data) ? data : []));
  }, [selectedPost]);

  useEffect(() => {
    if (loading) return;
    if (!heatmapContainerRef.current) return;
    heatmapContainerRef.current.innerHTML = '';
    const heatmapInstance = h337.create({
      container: heatmapContainerRef.current,
      radius: 40,
      maxOpacity: 0.6,
      minOpacity: 0,
      blur: 0.85,
    });
    heatmapInstance.setData({
      max: 10,
      data: points
    });
  }, [loading, points]);

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

  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const activeSessionIds = new Set(
    filteredEvents
      .filter(ev => {
        if (!ev.timestamp) return false;
        // Parse as UTC
        const ts = ev.timestamp.replace(' ', 'T') + 'Z';
        return new Date(ts).getTime() >= fiveMinutesAgo;
      })
      .map(ev => ev.session_id)
  );
  const activeUsers = activeSessionIds.size;

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

  // Compute cognitive load per post
  const cognitiveLoadPerPost = {};
  const postSessions = {};
  filteredEvents.forEach(ev => {
    const post = ev.post_title || ev.post_id || 'Unknown';
    const session = ev.session_id;
    if (!cognitiveLoadPerPost[post]) cognitiveLoadPerPost[post] = [];
    if (!postSessions[post]) postSessions[post] = {};
    if (!postSessions[post][session]) postSessions[post][session] = {scrolls: [], time: 0, interactions: 0};

    if (ev.event_type === 'scroll' && ev.data && typeof ev.data.percent === 'number') {
      postSessions[post][session].scrolls.push(ev.data.percent);
    }
    if (ev.event_type === 'heartbeat' && ev.data && typeof ev.data.timeOnPage === 'number') {
      postSessions[post][session].time = Math.max(postSessions[post][session].time, ev.data.timeOnPage);
    }
    if (['click', 'mousemove'].includes(ev.event_type)) {
      postSessions[post][session].interactions += 1;
    }
  });

  Object.entries(postSessions).forEach(([post, sessions]) => {
    let totalScore = 0, count = 0;
    Object.values(sessions).forEach(({scrolls, time, interactions}) => {
      const avgScroll = scrolls.length ? scrolls.reduce((a, b) => a + b, 0) / scrolls.length : 0;
      // Normalize: scroll (0-100), time (max 300s), interactions (max 50)
      const scrollScore = Math.min(avgScroll, 100) / 100;
      const timeScore = Math.min(time, 300) / 300;
      const interactionScore = Math.min(interactions, 50) / 50;
      // Weighted sum
      const score = (scrollScore * 0.4 + timeScore * 0.3 + interactionScore * 0.3) * 100;
      totalScore += score;
      count++;
    });
    cognitiveLoadPerPost[post] = count ? Math.round(totalScore / count) : 0;
  });


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
          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
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
            <div className="bg-gray/40 backdrop-blur-lg rounded-2xl shadow-xl p-6 flex flex-col items-center border border-pink-400/40 font-mont">
              <span className="text-2xl font-bold text-pink-100 drop-shadow">{activeUsers}</span>
              <span className="text-pink-200 text-sm mt-1">Active Users (5 min)</span>
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
              <ul className="flex-1 flex flex-col justify-center w-full gap-4">
                {topPosts.map(([post, count]) => (
                  <li key={post} className="text-gray-200 mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300">{post}:</span>
                        <span className="text-teal-200 text-sm">{count} events</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-300 font-semibold text-sm">Cognitive Load:</span>
                        <span className="font-bold text-yellow-200">{cognitiveLoadPerPost[post] ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-4 mt-1 border border-cyan-900/40 overflow-hidden">
                        <div
                          className="h-4 rounded-full transition-all duration-500"
                          style={{
                            width: `${cognitiveLoadPerPost[post] ?? 0}%`,
                            background: `linear-gradient(90deg, #fbbf24 0%, #06b6d4 100%)`,
                            boxShadow: '0 0 8px #fbbf24, 0 0 4px #06b6d4'
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="w-full max-w-4xl mb-8">
            {!selectedPost && (
              <div className="mt-4 text-center text-cyan-300 text-lg font-semibold">
                Please select a post to see heatmap.
              </div>
            )}
            <div className="relative w-full h-[400px] bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-cyan-400/40">
              <div ref={heatmapContainerRef} className="absolute inset-0 w-full h-full z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <span className="text-cyan-200 opacity-30">Heatmap Preview</span>
              </div>
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