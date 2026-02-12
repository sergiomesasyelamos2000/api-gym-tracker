import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp-up a 50 usuarios
    { duration: '3m', target: 100 }, // Ramp-up a 100 usuarios
    { duration: '2m', target: 100 }, // Mantener 100 usuarios
    { duration: '2m', target: 50 }, // Ramp-down a 50 usuarios
    { duration: '1m', target: 0 }, // Ramp-down a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% de las peticiones deben ser < 1s
    http_req_failed: ['rate<0.10'], // Menos del 10% de peticiones fallidas
  },
};

// Setup: Crear usuario de prueba
export function setup() {
  const testUser = {
    email: `stress-test-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: 'Stress Test User',
  };

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (registerRes.status === 201 || registerRes.status === 200) {
    return testUser;
  } else {
    return null;
  }
}

export default function (data) {
  if (!data) {
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
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).access_token;
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Simular carga realista
  const endpoints = [
    { method: 'GET', url: `${BASE_URL}/api/auth/me`, auth: true },
    { method: 'GET', url: `${BASE_URL}/api/routines`, auth: true },
    { method: 'GET', url: `${BASE_URL}/api/exercises`, auth: false },
    {
      method: 'GET',
      url: `${BASE_URL}/api/exercises/search?name=squat`,
      auth: false,
    },
    { method: 'GET', url: `${BASE_URL}/api/routines/stats/global`, auth: true },
  ];

  // Ejecutar peticiones aleatorias
  const randomEndpoint =
    endpoints[Math.floor(Math.random() * endpoints.length)];

  let res;
  if (randomEndpoint.auth) {
    res = http.get(randomEndpoint.url, authHeaders);
  } else {
    res = http.get(randomEndpoint.url);
  }

  check(res, {
    'status is 200': r => r.status === 200,
  });

  sleep(Math.random() * 3); // Sleep aleatorio entre 0-3 segundos
}

export function teardown(data) {
  if (data) {
  }
}
