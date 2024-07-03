const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host:process.env.DB_HOST,
  database:process.env.DB_NAME,
  password:process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


const convertCsvToJson = async (req, res) => {
  try {
    const file = req.file;
    const csvData = fs.readFileSync(file.path, 'utf-8');

    const jsonData = convertCsvDataToJson(csvData);
    calculateAgeDistribution(jsonData);
    await uploadJsonToDb(jsonData);

    res.json(jsonData);
  } catch (err) {
    console.error('Error processing CSV:', err);
    res.status(500).send('Internal Server Error');
  }
};


const convertCsvDataToJson = (csvData) => {
  const rows = csvData.split('\n');
  const headers = rows[0].split(',');
  const jsonData = [];

  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i].split(',');
    if (columns.every(column => column.trim() !== '')) {
      const jsonObject = createJsonObject(columns, headers);
      jsonData.push(jsonObject);
    }
  }

  return jsonData;
};

const createJsonObject = (columns, headers) => {
  const jsonObject = {
    name: {},
    age: null,
    address: {},
    gender: null,
  };

  for (let j = 0; j < columns.length; j++) {
    const columnName = headers[j];
    const columnValue = columns[j].trim();
    const parts = columnName.split('.');

    if (parts.length > 1) {
      let obj = jsonObject;
      for (let k = 0; k < parts.length - 1; k++) {
        if (!obj[parts[k]]) {
          obj[parts[k]] = {};
        }
        obj = obj[parts[k]];
      }
      obj[parts[parts.length - 1]] = columnValue;
    } else {
      if (columnName === 'name.firstname' || columnName === 'name.lastname') {
        jsonObject.name[columnName.split('.')[1]] = columnValue;
      } else if (columnName === 'age') {
        jsonObject.age = parseInt(columnValue);
      } else if (columnName.startsWith('address.')) {
        jsonObject.address[columnName.split('.')[1]] = columnValue;
      } else {
        jsonObject.gender = columnValue;
      }
    }
  }
  return jsonObject;
};
const calculateAgeDistribution = (jsonData) => {
  const ageGroups = {
    '< 20': 0,
    '20 to 40': 0,
    '40 to 60': 0,
    '> 60': 0,
  };

  jsonData.forEach((user) => {
    if (user.age < 20) {
      ageGroups['< 20']++;
    } else if (user.age >= 20 && user.age < 40) {
      ageGroups['20 to 40']++;
    } else if (user.age >= 40 && user.age < 60) {
      ageGroups['40 to 60']++;
    } else {
      ageGroups['> 60']++;
    }
  });

  const totalUsers = jsonData.length;
  const distribution = {};

  Object.keys(ageGroups).forEach((ageGroup) => {
    const count = ageGroups[ageGroup];
    const percentage = ((count / totalUsers) * 100).toFixed(2);
    distribution[ageGroup] = percentage;
  });

  console.log('Age-Group % Distribution');
  console.log('-------------------------');
  Object.keys(distribution).forEach((ageGroup) => {
    console.log(`${ageGroup.padEnd(10)} ${distribution[ageGroup]}%`);
  });
};
const uploadJsonToDb = async (jsonData) => {
  for (const row of jsonData) {
    const additionalInfo = {};
    Object.keys(row).forEach((key) => {
      if (key !== 'name' && key !== 'age' && key !== 'address') {
        additionalInfo[key] = row[key];
      }
    });

    const query = {
      text: `INSERT INTO Users (name, age, address, additional_info) VALUES ($1, $2, $3, $4)`,
      values: [
        `${row.name.firstname} ${row.name.lastname}`,
        row.age,
        JSON.stringify(row.address),
        JSON.stringify(additionalInfo),
      ],
    };

    try {
      await pool.query(query);
      console.log(`Uploaded record to database`);
    } catch (err) {
      console.error('Error uploading to database:', err);
    }
  }
};

module.exports = { convertCsvToJson };