const { getDefaultConfig } = require('expo/metro-config');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Auto-detect host IP address
function autoDetectIp() {
  const interfaces = os.networkInterfaces();
  const allIps = [];
  
  for (const devName in interfaces) {
    if (
      devName.toLowerCase().includes('vmware') ||
      devName.toLowerCase().includes('vmnet') ||
      devName.toLowerCase().includes('virtualbox') ||
      devName.toLowerCase().includes('vethernet') ||
      devName.toLowerCase().includes('loopback')
    ) {
      continue;
    }
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        allIps.push({
          interface: devName,
          ip: alias.address
        });
      }
    }
  }
  
  // Select localIp
  let localIp = 'localhost';
  
  // Try to find the one that is NOT 192.168.56.1 and starts with 192.168.1. or is a typical LAN
  // Prioritize 192.168.1.x or 192.168.0.x or any 192.168.x.x that isn't 192.168.56.1
  const priorityIp = allIps.find(item => 
    item.ip.startsWith('192.168.') && 
    !item.ip.startsWith('192.168.56.')
  );
  
  if (priorityIp) {
    localIp = priorityIp.ip;
  } else {
    // Fallback to any non-internal IPv4
    const fallbackIp = allIps.find(item => item.ip !== '127.0.0.1');
    if (fallbackIp) {
      localIp = fallbackIp.ip;
    }
  }
  
  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  const targetLine = `EXPO_PUBLIC_API_URL=http://${localIp}:8082`;
  console.log(`[AutoIP] Selected local IP: ${localIp}`);
  
  let lines = envContent.split('\n');
  let updated = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('EXPO_PUBLIC_API_URL=')) {
      const val = lines[i].replace('EXPO_PUBLIC_API_URL=', '').trim();
      if (val.includes('localhost') || val.includes('127.0.0.1') || envContent.includes('# manual')) {
        console.log(`[AutoIP] Detected manual setup: ${lines[i].trim()}. Skipping auto-detection.`);
        return;
      }
      if (lines[i].trim() !== targetLine) {
        lines[i] = targetLine;
        updated = true;
      } else {
        console.log(`[AutoIP] .env already has correct API URL: ${targetLine}`);
        return;
      }
    }
  }
  
  if (!updated) {
    lines.push(targetLine);
  }
  
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log(`[AutoIP] Updated .env file with current IP address!`);
}

try {
  autoDetectIp();
} catch (e) {
  console.error('[AutoIP] Error updating IP address:', e);
}

module.exports = getDefaultConfig(__dirname);
