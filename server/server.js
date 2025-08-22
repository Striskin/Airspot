require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const workerRoutes = require('./routes/workers');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:true, useUnifiedTopology:true
}).then(()=> console.log('Mongo connected')).catch(e=>console.error(e));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/workers', workerRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});


app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));
