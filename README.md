# 🌾 Annsetu — Live Mandi Price Application

> **Annsetu** (अन्नसेतु) means "bridge of food/grain" in Sanskrit.  
> This app bridges farmers and markets by surfacing real-time mandi commodity prices from the Government of India's Open Data Portal.

---

## Quick Start

### Prerequisites

- **Node.js** v18+ installed → [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- An API key from [data.gov.in](https://data.gov.in)

---

### 1. Clone / Extract the Project

```bash
# If using the ZIP:
unzip annsetu.zip
cd annsetu
```

---

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Copy the environment file and add your API key:

```bash
cp .env.example .env
```

Open `.env` and set your key:

```
MANDI_API_KEY=your_api_key_here
PORT=3001
```

> Your API key is already pre-filled in `.env` for convenience. You can update it anytime.

Start the backend server:

```bash
npm start
```

You should see:

```
✅ Annsetu backend running on http://localhost:3001
```

---

### 3. Open the Frontend

The frontend is plain HTML/CSS/JS — no build step needed.

Open a **new terminal tab** and navigate to the frontend folder:

```bash
cd frontend
```

Simply open `index.html` in your browser:

- **macOS:** `open index.html`
- **Windows:** `start index.html`
- **Linux:** `xdg-open index.html`

Or drag and drop `index.html` into any browser window.

---

### 4. Use the App

1. Click **"Get Mandi Prices"**
2. Watch the loading spinner while data is fetched
3. See the **Minimum** and **Maximum** prices animate into view
4. Scroll down for the full commodity breakdown table

---

## Project Structure

```
annsetu/
├── backend/
│   ├── server.js          ← Express API server
│   ├── package.json       ← Node dependencies
│   ├── .env               ← API key (DO NOT commit to Git)
│   └── .env.example       ← Template for new developers
│
├── frontend/
│   ├── index.html         ← Single-page UI
│   ├── style.css          ← All visual styling
│   └── app.js             ← Fetch logic and DOM updates
│
├── README.md              ← This file
└── STUDY_GUIDE.md         ← Full project walkthrough for beginners
```

---

## Environment Variables

| Variable       | Description                              | Default |
|----------------|------------------------------------------|---------|
| `MANDI_API_KEY`| Your data.gov.in API key                 | —       |
| `PORT`         | Port the backend server listens on       | `3001`  |

---

## API Reference

### `GET /api/mandi-prices`

Fetches the latest mandi prices from data.gov.in.

**Response (success):**
```json
{
  "success": true,
  "summary": {
    "minPrice": 500,
    "maxPrice": 4200,
    "totalRecords": 10
  },
  "records": [
    {
      "commodity": "Wheat",
      "market": "Azadpur",
      "state": "Delhi",
      "minPrice": 1800,
      "maxPrice": 2200,
      "modalPrice": 2000,
      "variety": "Other",
      "arrivalDate": "01/06/2025"
    }
  ]
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Description of the problem"
}
```

### `GET /health`

Returns `{ "status": "ok" }` — used to verify the server is running.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot connect to backend" | Make sure `npm start` is running in the `backend/` folder |
| "Invalid or expired API key" | Update `MANDI_API_KEY` in `backend/.env` |
| "No data found" | The government API may be temporarily unavailable — try again |
| CORS error in browser console | Ensure backend is on port 3001 (default) |

---

## Development Mode (Auto-restart)

```bash
cd backend
npm run dev   # uses nodemon — restarts on file save
```

---

## Deployment Notes

- **Backend:** Can be deployed to [Render](https://render.com), [Railway](https://railway.app), or any Node.js host. Set `MANDI_API_KEY` as an environment variable on the platform.
- **Frontend:** Can be served via [Netlify](https://netlify.com), [Vercel](https://vercel.com), or GitHub Pages. Update `BACKEND_URL` in `app.js` to point to your deployed backend URL.

---

## License

MIT — Free to use, modify, and distribute.
