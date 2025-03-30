const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');

  const store = new MongoStore({ mongoose: mongoose });

  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 60000,
    }),
    puppeteer: { headless: true },
  });

  client.on('qr', (qr) => {
    console.log('Scan the QR code below:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp client is ready!');
  });

  client.initialize();

  app.post('/sendmessage', async (req, res) => {
    try {
      let { number, message, api_key } = req.body;

      console.log('Received request to send message:', req.body);

      if (!number || !message || !api_key) {
        return res.status(400).json({ error: 'Please provide number, message, and API key.' });
      }
      if (api_key !== process.env.API_KEY) {
        return res.status(403).json({ error: 'Invalid API key.' });
      }
      number = number.replace(/\s+/g, '');
      if (number.length !== 12) {
        return res.status(400).json({ error: 'Invalid number format. It should be 12 digits including the 2-digit country code.' });
      }

      const chatId = `${number}@c.us`;

      await client.sendMessage(chatId, message);
      console.log(`Message sent to ${number}: ${message}`);
      res.json({ success: true, message: `Message sent to ${number}` });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  });

//   app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
//   });

}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

module.exports = app;