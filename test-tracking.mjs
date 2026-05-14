import { CourierServiceManager } from './utils/courierServices.js';

async function test() {
  const manager = new CourierServiceManager();
  try {
    const res = await manager.trackShipment('courier-guy', 'TCG-SANDBOX-TRACKING-123'); // or whatever
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
