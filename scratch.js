import mongoose from 'mongoose';
import Cart from './models/Cart.js';
import User from './models/User.js';
import connectDB from './config/database.js';

async function run() {
  await connectDB();
  const cart = await Cart.findOne().populate({
    path: 'items.product',
    select: 'title images price stock ownerName owner dimensions weight',
    populate: {
      path: 'owner',
      select: 'storename email phone address city province zipCode country',
    },
  });
  console.log(JSON.stringify(cart, null, 2));
  process.exit(0);
}

run();
