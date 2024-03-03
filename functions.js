import axios from 'axios';
import config from './config.js';

export const createRecord = async (orders) => {
  const url = 'https://api.airtable.com/v0/appbnluH463ay8yB9/Orders';
  const headers = {
    Authorization: `Bearer ${config.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Getting today's date in dd/mm/yyyy format
  const now = new Date();
  const date =
    now.getDate().toString().padStart(2, '0') +
    '/' +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    now.getFullYear().toString();

  // Transforming orders into Airtable records format
  const records = orders.map((order) => ({
    fields: {
      Customer: order.customer,
      Quantity: order.quantity,
      Product: order.product,
      Date: date,
    },
  }));

  const data = { records };

  try {
    const response = await axios.post(url, data, { headers: headers });

    if (response.status === 200) {
      console.log('Orders created successfully.');
      return response.data;
    } else {
      console.log(`Failed to create orders: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};
