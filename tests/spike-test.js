import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Carga normal
    { duration: '10s', target: 100 }, // Spike repentino a 100 usuarios
    { duration: '30s', target: 100 }, // Mantener el spike
    { duration: '10s', target: 10 }, // Recuperación rápida
    { duration: '10s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las peticiones deben ser < 2s (más permisivo)
    http_req_failed: ['rate<0.15'], // Menos del 15% de peticiones fallidas
  },
};

// Setup: Crear usuario de prueba
export function setup() {
  const testUser = {
    email: `spike-test-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: 'Spike Test User',
  };

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (registerRes.status === 201 || registerRes.status === 200) {
    console.log('Spike test user created successfully');
    return testUser;
  } else {
    console.error('Failed to create spike test user:', registerRes.body);
    return null;
  }
}

export default function (data) {
  if (!data) {
    console.error('No test user available, skipping test');
    return;
  }

  // Login
  const loginPayload = JSON.stringify({
    email: data.email,
    password: data.password,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login successful': r => r.status === 200 || r.status === 201,
  });

  if (!loginSuccess) {
    sleep(0.5);
    return;
  }

  const token = JSON.parse(loginRes.body).access_token;
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Durante el spike, hacer peticiones rápidas
  const res = http.get(`${BASE_URL}/api/exercises`, authHeaders);

  check(res, {
    'status is 200': r => r.status === 200,
    'response time < 3s': r => r.timings.duration < 3000,
  });

  sleep(0.5); // Sleep corto para simular tráfico intenso
}

export function teardown(data) {
  if (data) {
    console.log('Spike test completed. User:', data.email);
  }
}
