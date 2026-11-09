// Shared config for the customer-distribution simulation: which
// customers exist, and the fixed, non-colliding port each one's frontend
// and backend services run on so all three (plus your own main dev
// servers on 5173/8080-8083) can run at the same time.
//
// Scheme: customer N -> frontend 9000 + N*10, backend base 8080 + N*100
// (api-gateway = base, sales/service/analytics = base+1/+2/+3, mirroring
// the main backend's own 8080/8081/8082/8083 offsets).
//
//   Customer-1: frontend 9010, gateway 8180, sales 8181, service 8182, analytics 8183
//   Customer-2: frontend 9020, gateway 8280, sales 8281, service 8282, analytics 8283
//   Customer-3: frontend 9030, gateway 8380, sales 8381, service 8382, analytics 8383

import path from 'node:path';

export const CUSTOMERS = ['Customer-1', 'Customer-2', 'Customer-3'];

export function customerNumber(customerId) {
  const n = Number(customerId.split('-')[1]);
  if (!CUSTOMERS.includes(customerId) || !Number.isInteger(n)) {
    throw new Error(`Unknown customer "${customerId}"`);
  }
  return n;
}

export function portsFor(customerId) {
  const n = customerNumber(customerId);
  const backendBase = 8080 + n * 100;
  return {
    frontend: 9000 + n * 10,
    'api-gateway': backendBase,
    'sales-service': backendBase + 1,
    'service-service': backendBase + 2,
    'analytics-service': backendBase + 3,
  };
}

export function customerDir(repoRoot, customerId) {
  customerNumber(customerId); // validates
  return path.join(repoRoot, customerId);
}
