import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // 1 usuario virtual
  duration: '10s', // durante 10 segundos
};

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';

export default function () {
  // Test endpoint público que no requiere autenticación
  const res = http.get(`${BASE_URL}/api/exercises`);

  // Comprueba que la respuesta fue exitosa
  check(res, {
    'status was 200': r => r.status === 200,
    'response has data': r => r.body.length > 0,
  });

  sleep(1);
}
