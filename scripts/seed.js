const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { v7: uuidv7 } = require('uuid');

dotenv.config();

const profileSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String },
  gender: { type: String },
  gender_probability: { type: Number },
  age: { type: Number },
  age_group: { type: String },
  country_id: { type: String },
  country_name: { type: String },
  country_probability: { type: Number },
  created_at: { type: Date, default: Date.now },
});

const Profile = mongoose.model('Profile', profileSchema);

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected...');
    console.log('Database:', mongoose.connection.name);

    const filePath = path.join(__dirname, '../data/profiles.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const profiles = JSON.parse(rawData);
    console.log(`Found ${profiles.length} profiles in JSON file...`);

    // Drop and recreate clean
    // Check if already seeded
const existingCount = await mongoose.connection
  .collection('profiles')
  .countDocuments();

if (existingCount >= profiles.length) {
  console.log(`Database already has ${existingCount} profiles. Nothing to do.`);
  process.exit(0);
}

// If partial, drop and start clean
if (existingCount > 0) {
  await mongoose.connection.collection('profiles').drop();
  console.log(`Dropped partial data (${existingCount} records). Reseeding...`);
}

    // Add uuid v7 id to each profile
    const profilesWithIds = profiles.map(p => ({
      ...p,
      id: uuidv7(),
      country_id: p.country_id.toUpperCase(),
      created_at: new Date(),
    }));

    // Insert in batches of 200
    const batchSize = 200;
    let totalInserted = 0;

    for (let i = 0; i < profilesWithIds.length; i += batchSize) {
      const batch = profilesWithIds.slice(i, i + batchSize);
      const result = await mongoose.connection
        .collection('profiles')
        .insertMany(batch, { ordered: false });
      totalInserted += result.insertedCount;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: inserted ${result.insertedCount}`);
    }

    console.log('--- Seeding Complete ---');
    console.log(`Total inserted: ${totalInserted}`);
    process.exit(0);

  } catch (err) {
    console.error('Seeder crashed:', err.message);
    process.exit(1);
  }
};

seedDB();