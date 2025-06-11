# Cognito - AI-Powered Reader Engagement & Cognitive Load Analytics

Cognito is a WordPress plugin that provides advanced analytics for reader engagement and cognitive load on your posts and pages. It features a modern React dashboard, heatmaps, event breakdowns, and AI-powered suggestions for improving your content.

---

## ✨ Features

- **Dashboard**: Visualize sessions, events, engagement over time, and cognitive load per post/page.
- **Heatmaps**: See where users interact most on your content.
- **Event Filtering**: Filter analytics by event type, post/page, and date range.
- **AI Suggestions**: Get actionable tips to make your content easier to understand (supports Groq, OpenAI, TogetherAI, etc.).
- **Modern UI**: Built with React, Chart.js, and Tailwind CSS for a beautiful, responsive experience.

---

## 🚀 Installation

1. **Clone or Download** this repository into your WordPress plugins directory:
   ```
   wp-content/plugins/cognito/
   ```

2. **Activate the Plugin**  
   Go to your WordPress admin dashboard → Plugins → Activate "Cognito".

3. **Install Dependencies (for Dashboard UI)**
   - Navigate to `wp-content/plugins/cognito/admin/dashboard/`
   - Run:
     ```bash
     npm install
     npm run build
     ```
   - (Or use `yarn` if you prefer.)

4. **Set Your AI API Key**
   - Get a free API key from [Groq](https://console.groq.com/keys)
   - Open your `wp-config.php` and add above the "stop editing" line:
     ```php
     define('COGNITO_OPENAI_API_KEY', 'your-api-key-here');
     ```

5. **(Optional) Configure API Endpoint/Model**
   - By default, the plugin uses Groq's Llama 4 model.
   - To use a different provider, update the endpoint and model in `cognito.php`:
     ```php
     // For Groq
     $endpoint = 'https://api.groq.com/openai/v1/chat/completions';
     $model = 'meta-llama/llama-4-scout-17b-16e-instruct';
     // For TogetherAI
     // $endpoint = 'https://api.together.xyz/v1/chat/completions';
     // $model = 'meta-llama/Llama-3-8b-chat-hf';
     ```

---

## 🖥️ Usage

1. **View the Dashboard**
   - Go to WP Admin → Cognito Dashboard.
   - Filter by event type, post/page, or date range.
   - See heatmaps, engagement charts, and cognitive load scores.

2. **Get AI Suggestions**
   - Select a post or page.
   - Click "Analyze Difficult Paragraphs".
   - Wait for AI-powered suggestions to appear below.

---

## 🛠️ Configuration

- **API Key**: Required for AI suggestions. Supports Groq and OpenAI.
- **Models**: You can change the model in the PHP code to any supported by your provider.
- **Permissions**: The plugin registers REST API endpoints with open permissions for analytics. Secure as needed.

---

## 🧩 Tech Stack

- **WordPress** (PHP backend)
- **React** (frontend dashboard)
- **Chart.js** (visualizations)
- **heatmap.js** (heatmaps)
- **Tailwind CSS** (styling)
- **AI Providers**: Groq, TogetherAI, OpenRouter, OpenAI

---

## 📝 Troubleshooting

- **AI Suggestions Not Working?**
  - Make sure your API key is valid and has quota.
  - Check the PHP error log (`wp-content/debug.log`) for API errors.
  - Try a different provider if Groq is having issues.

- **No Events Showing?**
  - Make sure the plugin is active and tracking is enabled.
  - Check browser console and network tab for errors.

- **Heatmap Not Displaying?**
  - Ensure you have events with x/y data (e.g., clicks, mousemoves).

---

## 📄 License

MIT License

---

## 🙏 Credits

- [Groq](https://groq.com/)
- [Chart.js](https://www.chartjs.org/)
- [heatmap.js](https://www.patrick-wied.at/static/heatmapjs/)

---

## 💬 Support

For issues, open a GitHub issue or contact the plugin author.

---