import dotenv from 'dotenv';
dotenv.config();

import ngrok from '@ngrok/ngrok';
import fs from 'fs';

const startNgrok = async () => {
  const listener = await ngrok.forward({
    proto: 'http',
    addr: 5173,
    authtoken: process.env.NGROK_AUTHTOKEN,
    metadata: 'beconnected',
  });

  // Write URL to file
  fs.writeFileSync(
    '.sst/beconnected-ngrok.json',
    JSON.stringify({ public_url: listener.url() })
  );

  console.log('** Ngrok forwarding has been set up. URL: ', listener.url());

  // Keep the process (and tunnel) open - listen to stdin
  process.stdin.resume();
};

startNgrok().catch(console.error);
