import express from 'express';
import cors from 'cors';
// Import your other routes and configurations here

const app = express();

app.use(cors());
app.use(express.json());

// Example route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running successfully!' });
});

export default app;