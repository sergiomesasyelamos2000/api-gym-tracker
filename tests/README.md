# k6 Stress Testing Guide

Este directorio contiene las pruebas de estrés para la API usando k6.

## 🚀 Ejecución Rápida

### Opción 1: Usando Docker Compose (Recomendado)

No necesitas instalar k6 localmente. Simplemente usa Docker Compose:

```bash
# Smoke Test (10 segundos, 1 usuario)
docker compose run --rm k6 run /scripts/smoke-test.js

# Load Test (2 minutos, hasta 20 usuarios)
docker compose run --rm k6 run /scripts/load-test.js

# Stress Test (10 minutos, hasta 100 usuarios)
docker compose run --rm k6 run /scripts/stress-test.js

# Spike Test (1 minuto, spike repentino a 100 usuarios)
docker compose run --rm k6 run /scripts/spike-test.js
```

### Opción 2: Usando k6 Instalado Localmente

Si tienes k6 instalado:

```bash
# Instalar k6 (Windows con Chocolatey)
choco install k6

# Ejecutar tests
cd tests
k6 run smoke-test.js
k6 run load-test.js
k6 run stress-test.js
k6 run spike-test.js
```

## 📊 Tipos de Pruebas

### 1. Smoke Test (`smoke-test.js`)

- **Duración**: 10 segundos
- **Usuarios**: 1 VU
- **Objetivo**: Verificar que la API está funcionando correctamente
- **Endpoints**: GET /api/exercises (público)

### 2. Load Test (`load-test.js`)

- **Duración**: ~2 minutos
- **Usuarios**: Ramp-up a 20 VUs
- **Objetivo**: Simular carga realista de usuarios
- **Flujo**:
  1. Registro de usuario de prueba
  2. Login y obtención de token
  3. Peticiones autenticadas a múltiples endpoints
  4. Validación de respuestas

### 3. Stress Test (`stress-test.js`)

- **Duración**: ~10 minutos
- **Usuarios**: Ramp-up gradual hasta 100 VUs
- **Objetivo**: Encontrar el punto de quiebre de la API
- **Métricas**: Identifica cuándo empiezan a fallar las peticiones

### 4. Spike Test (`spike-test.js`)

- **Duración**: ~1 minuto
- **Usuarios**: Spike repentino de 10 a 100 VUs
- **Objetivo**: Validar recuperación ante picos de tráfico
- **Métricas**: Verifica que el sistema se recupera después del spike

## 📈 Interpretación de Resultados

### Métricas Clave

- **http_req_duration**: Tiempo de respuesta de las peticiones
  - `p(95)`: 95% de las peticiones deben completarse en este tiempo
  - ✅ Objetivo: < 500ms para operaciones de lectura
  - ✅ Objetivo: < 1s para operaciones de escritura

- **http_req_failed**: Porcentaje de peticiones fallidas
  - ✅ Objetivo: < 5% en carga normal
  - ⚠️ Aceptable: < 10% en stress test
  - ❌ Problema: > 15% indica problemas serios

- **http_reqs**: Peticiones por segundo (throughput)
  - Indica la capacidad de la API

- **vus**: Usuarios virtuales concurrentes
  - Muestra la carga actual

### Ejemplo de Salida

```
     ✓ login successful
     ✓ get routines status is 200

     checks.........................: 100.00% ✓ 1234      ✗ 0
     data_received..................: 2.1 MB  35 kB/s
     data_sent......................: 156 kB  2.6 kB/s
     http_req_blocked...............: avg=1.23ms   min=0s     med=0s      max=123ms   p(90)=0s      p(95)=0s
     http_req_duration..............: avg=234.56ms min=45ms   med=198ms   max=1.2s    p(90)=456ms   p(95)=567ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 1234
     http_reqs......................: 1234    20.566667/s
     vus............................: 20      min=1       max=20
```

## 🔍 Monitoreo Durante las Pruebas

### Ver Logs de la API

En otra terminal, mientras corren las pruebas:

```bash
docker compose logs -f api
```

### Monitorear Base de Datos

```bash
docker compose logs -f postgres
```

## ⚙️ Configuración

### Variables de Entorno

Los tests usan la variable `BASE_URL` que se configura automáticamente en Docker Compose:

```yaml
environment:
  - BASE_URL=http://api:3000
```

Si ejecutas k6 localmente, puedes configurarla:

```bash
BASE_URL=http://localhost:3000 k6 run tests/smoke-test.js
```

### Modificar Carga

Puedes editar los archivos de test para ajustar la carga:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Cambiar target para más/menos usuarios
    { duration: '1m', target: 50 },
    { duration: '10s', target: 0 },
  ],
};
```

## 🎯 Mejores Prácticas

1. **Ejecuta siempre el smoke test primero** para verificar que la API está funcionando
2. **Monitorea los logs** mientras corren las pruebas para detectar errores
3. **Ejecuta las pruebas en orden**: smoke → load → stress → spike
4. **Espera entre pruebas** para que el sistema se estabilice
5. **Documenta los resultados** para comparar mejoras de rendimiento

## 🐛 Troubleshooting

### Error: "Connection refused"

- Verifica que la API está corriendo: `docker compose ps`
- Asegúrate de que el servicio `api` está healthy

### Error: "Login failed"

- Los tests crean usuarios de prueba automáticamente
- Si falla, verifica que el endpoint `/api/auth/register` funciona

### Resultados inconsistentes

- La base de datos puede estar bajo carga
- Ejecuta las pruebas cuando el sistema esté en reposo
- Considera limpiar la base de datos entre pruebas

## 📚 Recursos

- [Documentación oficial de k6](https://k6.io/docs/)
- [Guía de métricas de k6](https://k6.io/docs/using-k6/metrics/)
- [Tipos de pruebas de carga](https://k6.io/docs/test-types/introduction/)
