import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';

// Custom metrics
const loginErrors = new Counter('login_errors');
const authErrors = new Counter('auth_errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Sube a 20 usuarios en 30s
    { duration: '1m', target: 20 }, // Se mantiene en 20 usuarios por 1m
    { duration: '10s', target: 0 }, // Baja a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de las peticiones deben ser < 500ms
    http_req_failed: ['rate<0.05'], // Menos del 5% de peticiones fallidas
  },
};

// Setup: Crear usuario de prueba
export function setup() {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: 'Test User',
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

  // 1. Login
  const loginPayload = JSON.stringify({
    email: data.email,
    password: data.password,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status is 200 or 201': r => r.status === 200 || r.status === 201,
    'login has access_token': r => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    loginErrors.add(1);
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).access_token;

  // 2. Headers para peticiones autenticadas
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 3. Get current user
  const meRes = http.get(`${BASE_URL}/api/auth/me`, authHeaders);
  check(meRes, {
    'get me status is 200': r => r.status === 200,
  });

  sleep(1);

  // 4. Get routines
  const routinesRes = http.get(`${BASE_URL}/api/routines`, authHeaders);
  check(routinesRes, {
    'get routines status is 200': r => r.status === 200,
  });

  sleep(1);

  // 5. Get exercises (público)
  const exercisesRes = http.get(`${BASE_URL}/api/exercises`);
  check(exercisesRes, {
    'get exercises status is 200': r => r.status === 200,
  });

  sleep(1);

  // 6. Search exercises
  const searchRes = http.get(`${BASE_URL}/api/exercises/search?name=bench`);
  check(searchRes, {
    'search exercises status is 200': r => r.status === 200,
  });

  sleep(1);

  // 7. Get global stats
  const statsRes = http.get(
    `${BASE_URL}/api/routines/stats/global`,
    authHeaders,
  );
  check(statsRes, {
    'get stats status is 200': r => r.status === 200,
  });

  sleep(2);
}

// Teardown: Opcional - limpiar usuario de prueba
export function teardown(data) {
  if (data) {
  }
}
