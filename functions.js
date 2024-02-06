export const addRecordToAirtable = async (
  base,
  customer,
  quantity,
  product,
  date = '02/05/2024'
) => {
  try {
    const record = await base('Orders').create({
      Customer: customer,
      Quantity: quantity,
      Product: product,
      Date: date,
    });
    console.log('Created record:', record);
  } catch (err) {
    console.error('Error creating record:', err);
  }
};

export const createRecord = async (name, qty, product, date = '02/05/2024') => {
  const url = 'https://api.airtable.com/v0/appbnluH463ay8yB9/Orders';
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const data = {
    records: [
      {
        fields: {
          Customer: name,
          Quantity: qty,
          Product: product,
          Date: date,
        },
      },
    ],
  };

  try {
    const response = await axios.post(url, data, { headers: headers });

    if (response.status === 200) {
      console.log('Order created successfully.');
      return response.data;
    } else {
      console.log(`Failed to create order: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

//AirTable Function
// base('Orders')
//   .create({
//     Customer: 'Carolina',
//     Quantity: '2',
//     Product: 'Pan Arabe',
//     Date: '02/05/2024',
//   })
//   .then((record) => {
//     console.log('Created record:', record);
//   })
//   .catch((err) => {
//     console.error('Error creating record:', err);
//   });
