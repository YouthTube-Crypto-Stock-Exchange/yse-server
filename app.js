require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes/routes');
const {initEvents} = require('./blockchain/events');

const PORT = process.env.PORT || 8080;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(routes);

initEvents();

mongoose.connect(process.env.MONGO_STRING,{useNewUrlParser: true});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})

